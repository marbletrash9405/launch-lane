import { Router } from "express";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  CloseAdminJobParams,
  CloseAdminJobResponse,
  GetAdminJobsResponse,
  GetAdminJobApplicationsResponse,
  ReviewJobApplicationBody,
  ReviewJobApplicationParams,
  ReviewJobApplicationResponse,
  ReviewJobBody,
  ReviewJobParams,
  ReviewJobResponse,
} from "@workspace/api-zod";
import {
  db,
  guardianApprovalsTable,
  jobApplicationsTable,
  jobsTable,
  residentProfilesTable,
  studentProfilesTable,
  usersTable,
} from "@workspace/db";
import {
  requireAccount,
  requireRole,
  requireSignedIn,
} from "../lib/authorization";
import { getAdminJob, listAdminJobs } from "../lib/job-helpers";
// @ts-ignore - the shared mail helper is maintained in JavaScript.
import { sendEmail } from "../lib/notify.js";

const router = Router();
const adminAccess = [requireSignedIn, requireAccount, requireRole("admin")];

router.get("/admin/jobs", ...adminAccess, async (req, res): Promise<void> => {
  try {
    res.json(GetAdminJobsResponse.parse({ jobs: await listAdminJobs() }));
  } catch (error) {
    req.log.error({ err: error }, "Could not load admin job queue");
    res.status(500).json({ error: "We couldn't load the job review queue." });
  }
});

function adminApplicationShape(row: {
  application: typeof jobApplicationsTable.$inferSelect;
  jobTitle: string;
  studentName: string;
  studentEmail: string;
  age: number;
  privateAddress: string;
  guardianName: string;
  guardianEmail: string;
}) {
  return {
    id: row.application.id,
    jobId: row.application.jobId,
    jobTitle: row.jobTitle,
    studentFirstName: row.studentName.trim().split(/\s+/)[0] || "Student",
    studentEmail: row.studentEmail,
    age: row.age,
    message: row.application.message,
    status: row.application.status,
    rejectionReason: row.application.rejectionReason,
    privateAddress: row.privateAddress,
    guardianName: row.guardianName,
    guardianEmail: row.guardianEmail,
    createdAt: row.application.createdAt.toISOString(),
  };
}

async function getAdminApplication(applicationId: string) {
  const [row] = await db
    .select({
      application: jobApplicationsTable,
      jobTitle: jobsTable.title,
      studentName: usersTable.name,
      studentEmail: usersTable.email,
      age: studentProfilesTable.age,
      privateAddress: studentProfilesTable.homeAddress,
      guardianName: studentProfilesTable.guardianName,
      guardianEmail: studentProfilesTable.guardianEmail,
    })
    .from(jobApplicationsTable)
    .innerJoin(jobsTable, eq(jobsTable.id, jobApplicationsTable.jobId))
    .innerJoin(usersTable, eq(usersTable.id, jobApplicationsTable.studentId))
    .innerJoin(
      studentProfilesTable,
      eq(studentProfilesTable.userId, jobApplicationsTable.studentId),
    )
    .where(eq(jobApplicationsTable.id, applicationId))
    .limit(1);
  return row ? adminApplicationShape(row) : null;
}

router.get(
  "/admin/job-applications",
  ...adminAccess,
  async (req, res): Promise<void> => {
    try {
      const rows = await db
        .select({
          application: jobApplicationsTable,
          jobTitle: jobsTable.title,
          studentName: usersTable.name,
          studentEmail: usersTable.email,
          age: studentProfilesTable.age,
          privateAddress: studentProfilesTable.homeAddress,
          guardianName: studentProfilesTable.guardianName,
          guardianEmail: studentProfilesTable.guardianEmail,
        })
        .from(jobApplicationsTable)
        .innerJoin(jobsTable, eq(jobsTable.id, jobApplicationsTable.jobId))
        .innerJoin(usersTable, eq(usersTable.id, jobApplicationsTable.studentId))
        .innerJoin(
          studentProfilesTable,
          eq(studentProfilesTable.userId, jobApplicationsTable.studentId),
        )
        .where(eq(jobApplicationsTable.status, "pending_review"))
        .orderBy(desc(jobApplicationsTable.createdAt));
      res.json(
        GetAdminJobApplicationsResponse.parse({
          applications: rows.map(adminApplicationShape),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not load administrator job applications");
      res.status(500).json({ error: "We couldn't load the application review queue." });
    }
  },
);

router.post(
  "/admin/job-applications/:applicationId/review",
  ...adminAccess,
  async (req, res): Promise<void> => {
    const params = ReviewJobApplicationParams.safeParse(req.params);
    const parsed = ReviewJobApplicationBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Choose a valid application review action." });
      return;
    }
    const reason = parsed.data.reason?.trim() ?? "";
    if (parsed.data.action === "reject" && !reason) {
      res.status(400).json({ error: "Add a reason when rejecting an application." });
      return;
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [row] = await tx
          .select({
            application: jobApplicationsTable,
            job: jobsTable,
            student: usersTable,
            profile: studentProfilesTable,
          })
          .from(jobApplicationsTable)
          .innerJoin(jobsTable, eq(jobsTable.id, jobApplicationsTable.jobId))
          .innerJoin(usersTable, eq(usersTable.id, jobApplicationsTable.studentId))
          .innerJoin(
            studentProfilesTable,
            eq(studentProfilesTable.userId, jobApplicationsTable.studentId),
          )
          .where(eq(jobApplicationsTable.id, params.data.applicationId))
          .for("update")
          .limit(1);
        if (!row) return { kind: "not_found" as const };
        if (row.application.status !== "pending_review") {
          return { kind: "conflict" as const };
        }
        const now = new Date();
        const [application] = await tx
          .update(jobApplicationsTable)
          .set({
            status: parsed.data.action === "approve" ? "applied" : "rejected",
            rejectionReason: parsed.data.action === "reject" ? reason : null,
            updatedAt: now,
          })
          .where(
            and(
              eq(jobApplicationsTable.id, row.application.id),
              eq(jobApplicationsTable.status, "pending_review"),
            ),
          )
          .returning();
        if (!application) return { kind: "conflict" as const };
        const [resident] = await tx
          .select({ email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.id, row.job.residentId))
          .limit(1);
        if (!resident) throw new Error("The resident account is unavailable.");
        return { kind: "updated" as const, row, application, resident };
      });

      if (result.kind === "not_found") {
        res.status(404).json({ error: "Application not found." });
        return;
      }
      if (result.kind === "conflict") {
        res.status(409).json({ error: "This application is no longer waiting for review." });
        return;
      }

      if (parsed.data.action === "approve") {
        await sendEmail({
          to: [result.resident.email],
          subject: `New application: ${result.row.job.title}`,
          text: [
            `${result.row.student.name.trim().split(/\s+/)[0] || "A student"} applied for your job, ${result.row.job.title}.`,
            `Student age: ${result.row.profile.age}`,
            "",
            `Experience: ${result.application.message}`,
            "",
            "Open your Launch Lane dashboard to review applicants.",
          ].join("\n"),
        });
      } else {
        await sendEmail({
          to: [result.row.student.email],
          cc: [result.row.profile.guardianEmail],
          subject: `Launch Lane application update: ${result.row.job.title}`,
          text: [
            `Your application for ${result.row.job.title} was not approved.`,
            "",
            `Reason: ${reason}`,
            "",
            "You can browse other local jobs on Launch Lane.",
          ].join("\n"),
        });
      }
      const response = await getAdminApplication(params.data.applicationId);
      res.json(ReviewJobApplicationResponse.parse(response));
    } catch (error) {
      req.log.error({ err: error }, "Could not review student job application");
      res.status(500).json({ error: "We couldn't complete the application review." });
    }
  },
);

router.post(
  "/admin/jobs/:jobId/review",
  ...adminAccess,
  async (req, res): Promise<void> => {
    const params = ReviewJobParams.safeParse(req.params);
    const parsed = ReviewJobBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid job review request." });
      return;
    }
    const reason = parsed.data.reason?.trim() ?? "";
    if (parsed.data.action === "reject" && !reason) {
      res.status(400).json({ error: "Add a reason when rejecting a job." });
      return;
    }

    try {
      const current = await getAdminJob(params.data.jobId);
      if (!current) {
        res.status(404).json({ error: "Job not found." });
        return;
      }
      if (current.status !== "pending_review") {
        res.status(409).json({ error: "This job is no longer waiting for review." });
        return;
      }

      const nextStatus = parsed.data.action === "approve" ? "open" : "rejected";
      const [updated] = await db
        .update(jobsTable)
        .set({
          status: nextStatus,
          rejectionReason: parsed.data.action === "reject" ? reason : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobsTable.id, current.id),
            eq(jobsTable.status, "pending_review"),
          ),
        )
        .returning();
      if (!updated) {
        res.status(409).json({ error: "This job is no longer waiting for review." });
        return;
      }

      await sendEmail({
        to: [current.residentEmail],
        subject:
          parsed.data.action === "approve"
            ? `Your job is open: ${current.title}`
            : `Launch Lane job update: ${current.title}`,
        text:
          parsed.data.action === "approve"
            ? `Your job, ${current.title}, was approved and is now open for student applications.`
            : `Your job, ${current.title}, was not approved.\n\nReason: ${reason}\n\nPlease contact Launch Lane if you have questions.`,
      });
      const response = await getAdminJob(updated.id);
      res.json(ReviewJobResponse.parse(response));
    } catch (error) {
      req.log.error({ err: error }, "Could not review resident job");
      res.status(500).json({ error: "We couldn't complete the job review." });
    }
  },
);

router.post(
  "/admin/jobs/:jobId/close",
  ...adminAccess,
  async (req, res): Promise<void> => {
    const params = CloseAdminJobParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid job." });
      return;
    }
    try {
      const result = await db.transaction(async (tx) => {
        const [job] = await tx
          .select()
          .from(jobsTable)
          .where(eq(jobsTable.id, params.data.jobId))
          .for("update")
          .limit(1);
        if (!job) return { kind: "not_found" as const };
        if (job.status === "closed") return { kind: "conflict" as const };
        const now = new Date();
        const activeApplications = await tx
          .select({
            application: jobApplicationsTable,
            studentEmail: usersTable.email,
            guardianEmail: studentProfilesTable.guardianEmail,
          })
          .from(jobApplicationsTable)
          .innerJoin(usersTable, eq(usersTable.id, jobApplicationsTable.studentId))
          .innerJoin(
            studentProfilesTable,
            eq(studentProfilesTable.userId, jobApplicationsTable.studentId),
          )
          .where(
            and(
              eq(jobApplicationsTable.jobId, job.id),
              inArray(jobApplicationsTable.status, ["pending_review", "applied", "chosen"]),
            ),
          )
          .for("update");
        const applicationIds = activeApplications.map(
          (row) => row.application.id,
        );
        if (applicationIds.length) {
          await tx
            .update(jobApplicationsTable)
            .set({ status: "declined", updatedAt: now })
            .where(inArray(jobApplicationsTable.id, applicationIds));
          await tx
            .update(guardianApprovalsTable)
            .set({ consumedAt: now, decision: "declined" })
            .where(
              and(
                eq(guardianApprovalsTable.targetType, "job_application"),
                inArray(guardianApprovalsTable.targetId, applicationIds),
                isNull(guardianApprovalsTable.consumedAt),
              ),
            );
        }
        const [updated] = await tx
          .update(jobsTable)
          .set({ status: "closed", updatedAt: now })
          .where(eq(jobsTable.id, job.id))
          .returning();
        return { kind: "closed" as const, job: updated, activeApplications };
      });
      if (result.kind === "not_found") {
        res.status(404).json({ error: "Job not found." });
        return;
      }
      if (result.kind === "conflict") {
        res.status(409).json({ error: "This job is already closed." });
        return;
      }
      for (const row of result.activeApplications) {
        await sendEmail({
          to: [row.studentEmail],
          cc: [row.guardianEmail],
          subject: `Job closed: ${result.job.title}`,
          text: `Launch Lane closed ${result.job.title}. Your application is now declined.`,
        });
      }
      const response = await getAdminJob(result.job.id);
      res.json(CloseAdminJobResponse.parse(response));
    } catch (error) {
      req.log.error({ err: error }, "Could not close job as administrator");
      res.status(500).json({ error: "We couldn't unpublish this job." });
    }
  },
);

export default router;
