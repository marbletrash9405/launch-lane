import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  notExists,
  or,
} from "drizzle-orm";
import {
  CreateJobBody,
  CreateJobResponse,
  CreateJobApplicationBody,
  CreateJobApplicationParams,
  CreateJobApplicationResponse,
  GetMyJobApplicationsResponse,
  GetMyJobsResponse,
  GetPublicJobsResponse,
  WithdrawJobApplicationParams,
  WithdrawJobApplicationResponse,
  ChooseJobApplicantParams,
  CreateBusinessOpeningBody,
  CreateBusinessOpeningParams,
  CreateBusinessOpeningResponse,
  GetMyBusinessOpeningsResponse,
  ChooseJobApplicantResponse,
  CloseMyJobParams,
  CloseMyJobResponse,
} from "@workspace/api-zod";
import {
  businessesTable,
  db,
  guardianApprovalsTable,
  jobApplicationsTable,
  jobsTable,
  residentProfilesTable,
  studentProfilesTable,
  usersTable,
} from "@workspace/db";
import {
  getAccount,
  requireAccount,
  requireAnyRole,
  requireRole,
  requireSignedIn,
} from "../lib/authorization";
import { deriveResidentStreetName } from "../lib/resident-street";
import { getPublicOrigin } from "../lib/public-origin";
import { getPosterContact, getResidentJob, listResidentJobs } from "../lib/job-helpers";
// @ts-ignore - the shared mail helper is maintained in JavaScript.
import { sendEmail, sendNotification } from "../lib/notify.js";
import { createRateLimiter } from "../lib/rate-limit";

const router = Router();
const residentAccess = [requireSignedIn, requireAccount, requireRole("resident")];
const studentAccess = [requireSignedIn, requireAccount, requireRole("student")];
// Residents manage their jobs; student owners manage openings at their business.
const posterAccess = [requireSignedIn, requireAccount, requireAnyRole(["resident", "student"])];
const jobCreationLimiter = createRateLimiter({
  name: "job-post",
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Please wait before posting another job.",
});
const applicationLimiter = createRateLimiter({
  name: "job-apply",
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Please wait before applying to another job.",
});

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Neighbor";
const tokenDigest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function closeJobApplications(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  jobId: string,
  now: Date,
) {
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
        eq(jobApplicationsTable.jobId, jobId),
          inArray(jobApplicationsTable.status, ["pending_review", "applied", "chosen"]),
      ),
    )
    .for("update");

  const ids = activeApplications.map((row) => row.application.id);
  if (ids.length) {
    await tx
      .update(jobApplicationsTable)
      .set({ status: "declined", updatedAt: now })
      .where(inArray(jobApplicationsTable.id, ids));
    await tx
      .update(guardianApprovalsTable)
      .set({ consumedAt: now, decision: "declined" })
      .where(
        and(
          eq(guardianApprovalsTable.targetType, "job_application"),
          inArray(guardianApprovalsTable.targetId, ids),
          isNull(guardianApprovalsTable.consumedAt),
        ),
      );
  }
  return activeApplications;
}

router.get("/jobs/public", async (req, res): Promise<void> => {
  try {
    const activeChoice = db
      .select({ id: jobApplicationsTable.id })
      .from(jobApplicationsTable)
      .innerJoin(
        guardianApprovalsTable,
        eq(guardianApprovalsTable.targetId, jobApplicationsTable.id),
      )
      .where(
        and(
          eq(jobApplicationsTable.jobId, jobsTable.id),
          eq(jobApplicationsTable.status, "chosen"),
          eq(guardianApprovalsTable.targetType, "job_application"),
          isNull(guardianApprovalsTable.consumedAt),
          gt(guardianApprovalsTable.expiresAt, new Date()),
        ),
      );
    const rows = await db
      .select({
        job: jobsTable,
        streetName: residentProfilesTable.streetName,
        homeAddress: residentProfilesTable.homeAddress,
        businessName: businessesTable.name,
        businessStatus: businessesTable.status,
      })
      .from(jobsTable)
      .leftJoin(
        residentProfilesTable,
        eq(residentProfilesTable.userId, jobsTable.residentId),
      )
      .leftJoin(businessesTable, eq(businessesTable.id, jobsTable.businessId))
      .where(
        and(
          eq(jobsTable.status, "open"),
          notExists(activeChoice),
        ),
      )
      .orderBy(desc(jobsTable.createdAt));
    // Neighborhood jobs need a resident profile; openings need a live business.
    const visible = rows.filter((row) =>
      row.job.businessId ? row.businessStatus === "live" : row.homeAddress !== null,
    );
    res.json(
      GetPublicJobsResponse.parse({
        jobs: visible.map((row) => ({
          id: row.job.id,
          title: row.job.title,
          category: row.job.category,
          description: row.job.description,
          timing: row.job.timing,
          payText: row.job.payText,
          residentStreetName: row.job.businessId
            ? null
            : row.streetName ?? deriveResidentStreetName(row.homeAddress ?? ""),
          businessId: row.job.businessId ?? null,
          businessName: row.job.businessId ? row.businessName : null,
        })),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Could not load public jobs");
    res.status(500).json({ error: "We couldn't load local jobs." });
  }
});

router.get("/jobs/mine", ...residentAccess, async (req, res): Promise<void> => {
  const account = getAccount(res);
  try {
    const jobs = await listResidentJobs(account.user.id);
    res.json(GetMyJobsResponse.parse({ jobs }));
  } catch (error) {
    req.log.error({ err: error }, "Could not load resident jobs");
    res.status(500).json({ error: "We couldn't load your jobs." });
  }
});

router.post(
  "/jobs",
  jobCreationLimiter,
  ...residentAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    const parsed = CreateJobBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Check the job title, category, description, timing, and pay details." });
      return;
    }

    try {
      const [profile] = await db
        .select()
        .from(residentProfilesTable)
        .where(eq(residentProfilesTable.userId, account.user.id))
        .limit(1);
      if (!profile) {
        res.status(403).json({ error: "Complete your resident profile before posting a job." });
        return;
      }

      const [job] = await db
        .insert(jobsTable)
        .values({
          residentId: account.user.id,
          title: parsed.data.title.trim(),
          category: parsed.data.category,
          description: parsed.data.description.trim(),
          timing: parsed.data.timing.trim(),
          payText: parsed.data.payText.trim(),
          status: "pending_review",
        })
        .returning();
      await sendNotification({
        subject: `Job review needed: ${job.title}`,
        intro: "A resident job post is ready for administrator review.",
        replyTo: account.user.email,
        rows: [
          ["Resident", `${account.user.name} (${account.user.email})`],
          ["Job", job.title],
          ["Category", job.category],
          ["Description", job.description],
          ["Timing", job.timing],
          ["Pay", job.payText],
          ["Home address (private)", profile.homeAddress],
        ],
      });
      const response = await getResidentJob(job.id);
      res.status(201).json(CreateJobResponse.parse(response));
    } catch (error) {
      req.log.error({ err: error }, "Could not create resident job");
      res.status(500).json({ error: "We couldn't post your job. Please try again." });
    }
  },
);

router.post(
  "/jobs/:jobId/applications",
  applicationLimiter,
  ...studentAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    const params = CreateJobApplicationParams.safeParse(req.params);
    const parsed = CreateJobApplicationBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Add a short message about your experience, your availability, and whether you have another job." });
      return;
    }
    const otherJobDetails = parsed.data.otherJobDetails?.trim() ?? "";
    if (parsed.data.hasOtherJob && otherJobDetails.length < 2) {
      res.status(400).json({ error: "Tell us about your other job so we can check your availability." });
      return;
    }

    try {
      const [profile] = await db
        .select()
        .from(studentProfilesTable)
        .where(eq(studentProfilesTable.userId, account.user.id))
        .limit(1);
      if (!profile) {
        res.status(403).json({ error: "Complete your student profile before applying." });
        return;
      }

      const result = await db.transaction(async (tx) => {
        const [job] = await tx
          .select()
          .from(jobsTable)
          .where(eq(jobsTable.id, params.data.jobId))
          .for("update")
          .limit(1);
        if (!job || job.status !== "open") return { kind: "unavailable" as const };
        if (job.residentId === account.user.id) return { kind: "own_post" as const };
        let businessName: string | null = null;
        if (job.businessId) {
          const [business] = await tx
            .select({ name: businessesTable.name, status: businessesTable.status })
            .from(businessesTable)
            .where(eq(businessesTable.id, job.businessId))
            .limit(1);
          if (!business || business.status !== "live") return { kind: "unavailable" as const };
          businessName = business.name;
        }

        const now = new Date();
        const activeChoice = await tx
          .select({ id: jobApplicationsTable.id })
          .from(jobApplicationsTable)
          .innerJoin(
            guardianApprovalsTable,
            eq(guardianApprovalsTable.targetId, jobApplicationsTable.id),
          )
          .where(
            and(
              eq(jobApplicationsTable.jobId, job.id),
              eq(jobApplicationsTable.status, "chosen"),
              eq(guardianApprovalsTable.targetType, "job_application"),
              isNull(guardianApprovalsTable.consumedAt),
              gt(guardianApprovalsTable.expiresAt, now),
            ),
          )
          .limit(1);
        if (activeChoice.length) return { kind: "unavailable" as const };

        const staleChoices = await tx
          .select({ id: jobApplicationsTable.id })
          .from(jobApplicationsTable)
          .where(
            and(
              eq(jobApplicationsTable.jobId, job.id),
              eq(jobApplicationsTable.status, "chosen"),
            ),
          );
        if (staleChoices.length) {
          const staleIds = staleChoices.map((row) => row.id);
          await tx
            .update(jobApplicationsTable)
            .set({ status: "declined", updatedAt: now })
            .where(inArray(jobApplicationsTable.id, staleIds));
          await tx
            .update(guardianApprovalsTable)
            .set({ consumedAt: now, decision: "declined" })
            .where(
              and(
                eq(guardianApprovalsTable.targetType, "job_application"),
                inArray(guardianApprovalsTable.targetId, staleIds),
                isNull(guardianApprovalsTable.consumedAt),
              ),
            );
        }

        const [existing] = await tx
          .select({ id: jobApplicationsTable.id })
          .from(jobApplicationsTable)
          .where(
            and(
              eq(jobApplicationsTable.jobId, job.id),
              eq(jobApplicationsTable.studentId, account.user.id),
              or(
                eq(jobApplicationsTable.status, "pending_review"),
                eq(jobApplicationsTable.status, "applied"),
                eq(jobApplicationsTable.status, "chosen"),
                eq(jobApplicationsTable.status, "guardian_approved"),
              ),
            ),
          )
          .limit(1);
        if (existing) return { kind: "duplicate" as const };

        const [application] = await tx
          .insert(jobApplicationsTable)
          .values({
            jobId: job.id,
            studentId: account.user.id,
            message: parsed.data.message.trim(),
            hasOtherJob: parsed.data.hasOtherJob,
            otherJobDetails: parsed.data.hasOtherJob ? otherJobDetails : null,
            availability: parsed.data.availability.trim(),
            status: "pending_review",
          })
          .returning();
        return { kind: "created" as const, job, application, businessName };
      });

      if (result.kind === "unavailable") {
        res.status(404).json({ error: "This job is not accepting applications." });
        return;
      }
      if (result.kind === "duplicate") {
        res.status(409).json({ error: "You already have an active application for this job." });
        return;
      }
      if (result.kind === "own_post") {
        res.status(403).json({ error: "You can't apply to your own business's opening." });
        return;
      }

      await sendNotification({
        subject: `Application review needed: ${result.job.title}`,
        intro: "A student job application is ready for administrator review.",
        replyTo: account.user.email,
        rows: [
          ["Student", `${firstName(account.user.name)}, age ${profile.age}`],
          ["Student email", account.user.email],
          ["Private address", profile.homeAddress],
          ["Guardian", profile.guardianName],
          ["Guardian email", profile.guardianEmail],
          ...(result.businessName
            ? [["Opening at", result.businessName] as [string, string]]
            : []),
          ["Job", result.job.title],
          ["Experience", result.application.message],
          [
            "Other job",
            result.application.hasOtherJob
              ? `Yes: ${result.application.otherJobDetails}`
              : "No",
          ],
          ["Availability", result.application.availability ?? ""],
        ],
      });
      res.status(201).json(
        CreateJobApplicationResponse.parse({
          id: result.application.id,
          jobId: result.job.id,
          jobTitle: result.job.title,
          category: result.job.category,
          businessName: result.businessName,
          message: result.application.message,
          status: result.application.status,
          rejectionReason: result.application.rejectionReason,
          createdAt: result.application.createdAt.toISOString(),
          updatedAt: result.application.updatedAt.toISOString(),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not submit job application");
      res.status(500).json({ error: "We couldn't submit your application." });
    }
  },
);

router.get(
  "/jobs/applications/mine",
  ...studentAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    try {
      const rows = await db
        .select({
          application: jobApplicationsTable,
          jobTitle: jobsTable.title,
          category: jobsTable.category,
          businessName: businessesTable.name,
        })
        .from(jobApplicationsTable)
        .innerJoin(jobsTable, eq(jobsTable.id, jobApplicationsTable.jobId))
        .leftJoin(businessesTable, eq(businessesTable.id, jobsTable.businessId))
        .where(eq(jobApplicationsTable.studentId, account.user.id))
        .orderBy(desc(jobApplicationsTable.createdAt));
      res.json(
        GetMyJobApplicationsResponse.parse({
          applications: rows.map((row) => ({
            id: row.application.id,
            jobId: row.application.jobId,
            jobTitle: row.jobTitle,
            category: row.category,
            businessName: row.businessName ?? null,
            message: row.application.message,
            status: row.application.status,
            rejectionReason: row.application.rejectionReason,
            createdAt: row.application.createdAt.toISOString(),
            updatedAt: row.application.updatedAt.toISOString(),
          })),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not load student job applications");
      res.status(500).json({ error: "We couldn't load your job applications." });
    }
  },
);

router.post(
  "/jobs/applications/:applicationId/withdraw",
  ...studentAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    const params = WithdrawJobApplicationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid application." });
      return;
    }
    try {
      const result = await db.transaction(async (tx) => {
        const [initial] = await tx
          .select({ jobId: jobApplicationsTable.jobId })
          .from(jobApplicationsTable)
          .where(
            and(
              eq(jobApplicationsTable.id, params.data.applicationId),
              eq(jobApplicationsTable.studentId, account.user.id),
            ),
          )
          .limit(1);
        if (!initial) return { kind: "not_found" as const };

        const [job] = await tx
          .select()
          .from(jobsTable)
          .where(eq(jobsTable.id, initial.jobId))
          .for("update")
          .limit(1);
        const [application] = await tx
          .select()
          .from(jobApplicationsTable)
          .where(
            and(
              eq(jobApplicationsTable.id, params.data.applicationId),
              eq(jobApplicationsTable.studentId, account.user.id),
            ),
          )
          .for("update")
          .limit(1);
        if (!job || !application) return { kind: "not_found" as const };
        if (
          application.status !== "pending_review" &&
          application.status !== "applied" &&
          application.status !== "chosen"
        ) {
          return { kind: "conflict" as const };
        }

        const wasChosen = application.status === "chosen";
        const now = new Date();
        const [updated] = await tx
          .update(jobApplicationsTable)
          .set({ status: "withdrawn", updatedAt: now })
          .where(eq(jobApplicationsTable.id, application.id))
          .returning();
        if (wasChosen) {
          await tx
            .update(guardianApprovalsTable)
            .set({ consumedAt: now, decision: "declined" })
            .where(
              and(
                eq(guardianApprovalsTable.targetType, "job_application"),
                eq(guardianApprovalsTable.targetId, application.id),
                isNull(guardianApprovalsTable.consumedAt),
              ),
            );
        }
        return { kind: "withdrawn" as const, job, application: updated, wasChosen };
      });
      if (result.kind === "not_found") {
        res.status(404).json({ error: "Application not found." });
        return;
      }
      if (result.kind === "conflict") {
        res.status(409).json({ error: "This application can no longer be withdrawn." });
        return;
      }

      const poster = result.wasChosen ? await getPosterContact(result.job.residentId) : null;
      if (result.wasChosen && poster) {
        await sendEmail({
          to: [poster.email],
          cc: poster.cc,
          subject: `Application withdrawn: ${result.job.title}`,
          text: `${firstName(account.user.name)} withdrew their application for ${result.job.title}. The job is open for you to choose another applicant.`,
        });
      }
      res.json(
        WithdrawJobApplicationResponse.parse({
          id: result.application.id,
          jobId: result.application.jobId,
          jobTitle: result.job.title,
          category: result.job.category,
          businessName: result.job.businessId
            ? (await getResidentJob(result.job.id))?.businessName ?? null
            : null,
          message: result.application.message,
          status: result.application.status,
          rejectionReason: result.application.rejectionReason,
          createdAt: result.application.createdAt.toISOString(),
          updatedAt: result.application.updatedAt.toISOString(),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not withdraw job application");
      res.status(500).json({ error: "We couldn't withdraw your application." });
    }
  },
);

router.post(
  "/jobs/:jobId/applications/:applicationId/choose",
  ...posterAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    const params = ChooseJobApplicantParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid job or application." });
      return;
    }

    try {
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const result = await db.transaction(async (tx) => {
        const [job] = await tx
          .select()
          .from(jobsTable)
          .where(
            and(
              eq(jobsTable.id, params.data.jobId),
              eq(jobsTable.residentId, account.user.id),
            ),
          )
          .for("update")
          .limit(1);
        if (!job) return { kind: "not_found" as const };
        if (job.status !== "open") return { kind: "conflict" as const };

        const now = new Date();
        const activeChoice = await tx
          .select({ id: jobApplicationsTable.id })
          .from(jobApplicationsTable)
          .innerJoin(
            guardianApprovalsTable,
            eq(guardianApprovalsTable.targetId, jobApplicationsTable.id),
          )
          .where(
            and(
              eq(jobApplicationsTable.jobId, job.id),
              eq(jobApplicationsTable.status, "chosen"),
              eq(guardianApprovalsTable.targetType, "job_application"),
              isNull(guardianApprovalsTable.consumedAt),
              gt(guardianApprovalsTable.expiresAt, now),
            ),
          )
          .limit(1);
        if (activeChoice.length) return { kind: "conflict" as const };

        const staleChoices = await tx
          .select({ id: jobApplicationsTable.id })
          .from(jobApplicationsTable)
          .where(
            and(
              eq(jobApplicationsTable.jobId, job.id),
              eq(jobApplicationsTable.status, "chosen"),
            ),
          );
        if (staleChoices.length) {
          const staleIds = staleChoices.map((row) => row.id);
          await tx
            .update(jobApplicationsTable)
            .set({ status: "declined", updatedAt: now })
            .where(inArray(jobApplicationsTable.id, staleIds));
          await tx
            .update(guardianApprovalsTable)
            .set({ consumedAt: now, decision: "declined" })
            .where(
              and(
                eq(guardianApprovalsTable.targetType, "job_application"),
                inArray(guardianApprovalsTable.targetId, staleIds),
                isNull(guardianApprovalsTable.consumedAt),
              ),
            );
        }

        const [application] = await tx
          .select()
          .from(jobApplicationsTable)
          .where(
            and(
              eq(jobApplicationsTable.id, params.data.applicationId),
              eq(jobApplicationsTable.jobId, job.id),
              eq(jobApplicationsTable.status, "applied"),
            ),
          )
          .for("update")
          .limit(1);
        if (!application) return { kind: "invalid_application" as const };

        const [student] = await tx
          .select({
            name: usersTable.name,
            email: usersTable.email,
            guardianName: studentProfilesTable.guardianName,
            guardianEmail: studentProfilesTable.guardianEmail,
          })
          .from(usersTable)
          .innerJoin(
            studentProfilesTable,
            eq(studentProfilesTable.userId, usersTable.id),
          )
          .where(eq(usersTable.id, application.studentId))
          .limit(1);
        if (!student) throw new Error("Student profile is unavailable.");

        const [chosen] = await tx
          .update(jobApplicationsTable)
          .set({ status: "chosen", updatedAt: now })
          .where(eq(jobApplicationsTable.id, application.id))
          .returning();
        await tx.insert(guardianApprovalsTable).values({
          targetType: "job_application",
          targetId: application.id,
          tokenHash: tokenDigest(token),
          expiresAt,
        });
        return {
          kind: "chosen" as const,
          job,
          application: chosen,
          student,
        };
      });

      if (result.kind === "not_found") {
        res.status(404).json({ error: "Job not found." });
        return;
      }
      if (result.kind === "conflict") {
        res.status(409).json({ error: "This job already has a guardian approval request or is no longer open." });
        return;
      }
      if (result.kind === "invalid_application") {
        res.status(404).json({ error: "This applicant is no longer available." });
        return;
      }

      const approvalUrl = `${getPublicOrigin({
        publicAppUrl: process.env.PUBLIC_APP_URL,
        forwardedHost: req.get("x-forwarded-host"),
        host: req.get("host"),
        forwardedProtocol: req.get("x-forwarded-proto"),
      })}/guardian/approval/${token}`;
      await sendEmail({
        to: [result.student.guardianEmail],
        cc: [result.student.email],
        subject: `Please approve ${firstName(result.student.name)} taking a Launch Lane job`,
        text: [
          `Hello ${result.student.guardianName},`,
          "",
          result.job.businessId
            ? `${account.user.name} chose ${firstName(result.student.name)} for a role at their Launch Lane business: ${result.job.title}.`
            : `${account.user.name} chose ${firstName(result.student.name)} for ${result.job.title} in Mercer Crossing.`,
          "Please approve or decline this one-time request here:",
          "",
          approvalUrl,
          "",
          "This link expires in seven days.",
        ].join("\n"),
      });
      const response = await getResidentJob(result.job.id);
      res.json(ChooseJobApplicantResponse.parse(response));
    } catch (error) {
      req.log.error({ err: error }, "Could not choose a job applicant");
      res.status(500).json({ error: "We couldn't send the guardian approval request." });
    }
  },
);

router.post(
  "/jobs/:jobId/close",
  ...posterAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    const params = CloseMyJobParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid job." });
      return;
    }
    try {
      const result = await db.transaction(async (tx) => {
        const [job] = await tx
          .select()
          .from(jobsTable)
          .where(
            and(
              eq(jobsTable.id, params.data.jobId),
              eq(jobsTable.residentId, account.user.id),
            ),
          )
          .for("update")
          .limit(1);
        if (!job) return { kind: "not_found" as const };
        if (!["pending_review", "open"].includes(job.status)) {
          return { kind: "conflict" as const };
        }
        const now = new Date();
        const activeApplications = await closeJobApplications(tx, job.id, now);
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
        res.status(409).json({ error: "Only jobs awaiting review or open jobs can be closed by a resident." });
        return;
      }
      for (const row of result.activeApplications) {
        await sendEmail({
          to: [row.studentEmail],
          cc: [row.guardianEmail],
          subject: `Job closed: ${result.job.title}`,
          text: result.job.businessId
            ? `The business closed the opening ${result.job.title}. Your application is now declined.`
            : `The resident closed ${result.job.title}. Your application is now declined.`,
        });
      }
      const response = await getResidentJob(result.job.id);
      res.json(CloseMyJobResponse.parse(response));
    } catch (error) {
      req.log.error({ err: error }, "Could not close resident job");
      res.status(500).json({ error: "We couldn't close your job." });
    }
  },
);

router.get(
  "/businesses/openings/mine",
  ...studentAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    try {
      const jobs = (await listResidentJobs(account.user.id)).filter((job) => job.businessId);
      res.json(GetMyBusinessOpeningsResponse.parse({ jobs }));
    } catch (error) {
      req.log.error({ err: error }, "Could not load business openings");
      res.status(500).json({ error: "We couldn't load your openings." });
    }
  },
);

router.post(
  "/businesses/:businessId/openings",
  jobCreationLimiter,
  ...studentAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    const params = CreateBusinessOpeningParams.safeParse(req.params);
    const parsed = CreateBusinessOpeningBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Check the role title, category, description, schedule, and pay details." });
      return;
    }
    try {
      const [business] = await db
        .select()
        .from(businessesTable)
        .where(
          and(
            eq(businessesTable.id, params.data.businessId),
            eq(businessesTable.ownerId, account.user.id),
          ),
        )
        .limit(1);
      if (!business) {
        res.status(404).json({ error: "Business not found." });
        return;
      }
      if (business.status !== "live") {
        res.status(409).json({ error: "Your business must be approved and live before you can post an opening." });
        return;
      }
      const [profile] = await db
        .select()
        .from(studentProfilesTable)
        .where(eq(studentProfilesTable.userId, account.user.id))
        .limit(1);
      if (!profile) {
        res.status(403).json({ error: "Complete your student profile first." });
        return;
      }

      const [job] = await db
        .insert(jobsTable)
        .values({
          residentId: account.user.id,
          businessId: business.id,
          title: parsed.data.title.trim(),
          category: parsed.data.category,
          description: parsed.data.description.trim(),
          timing: parsed.data.timing.trim(),
          payText: parsed.data.payText.trim(),
          status: "pending_review",
        })
        .returning();
      await sendNotification({
        subject: `Opening review needed: ${job.title} at ${business.name}`,
        intro: "A student business posted an opening and it's ready for administrator review.",
        replyTo: account.user.email,
        rows: [
          ["Business", business.name],
          ["Owner", `${account.user.name} (${account.user.email}), age ${profile.age}`],
          ["Owner's guardian", `${profile.guardianName} (${profile.guardianEmail})`],
          ["Role", job.title],
          ["Category", job.category],
          ["Description", job.description],
          ["Schedule", job.timing],
          ["Pay", job.payText],
        ],
      });
      const response = await getResidentJob(job.id);
      res.status(201).json(CreateBusinessOpeningResponse.parse(response));
    } catch (error) {
      req.log.error({ err: error }, "Could not create business opening");
      res.status(500).json({ error: "We couldn't post your opening. Please try again." });
    }
  },
);

export default router;
