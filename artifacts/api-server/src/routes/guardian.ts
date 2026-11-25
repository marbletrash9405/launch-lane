import { createHash } from "node:crypto";
import { Router } from "express";
import {
  GetGuardianApprovalResponse,
  GetGuardianApprovalParams,
  SubmitGuardianApprovalResponse,
  SubmitGuardianApprovalBody,
  SubmitGuardianApprovalParams,
} from "@workspace/api-zod";
import {
  and,
  db,
  eq,
  gt,
  guardianApprovalsTable,
  businessesTable,
  isNull,
  inArray,
  jobApplicationsTable,
  jobsTable,
  studentProfilesTable,
  usersTable,
} from "@workspace/db";
import { createChatThread } from "../lib/chat-threads";
// @ts-ignore - this module preserves the original JavaScript email delivery helper.
import { sendEmail } from "../lib/notify.js";

const router = Router();

function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Student";
}

router.get("/guardian/approvals/:token", async (req, res) => {
  const params = GetGuardianApprovalParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "This approval link is invalid." });
    return;
  }
  try {
    const [approval] = await db
      .select()
      .from(guardianApprovalsTable)
      .where(
        eq(guardianApprovalsTable.tokenHash, tokenDigest(params.data.token)),
      )
      .limit(1);
    if (!approval) {
      res.status(404).json({ error: "This approval link is invalid." });
      return;
    }

    let details;
    if (approval.targetType === "business") {
      const [row] = await db
        .select({ business: businessesTable, studentName: usersTable.name })
        .from(businessesTable)
        .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
        .where(eq(businessesTable.id, approval.targetId))
        .limit(1);
      if (!row) {
        res.status(404).json({ error: "This approval link is invalid." });
        return;
      }
      details = {
        targetType: approval.targetType,
        businessName: row.business.name,
        category: row.business.category,
        jobTitle: null,
        residentFirstName: null,
        studentName: firstName(row.studentName),
      };
    } else {
      const [row] = await db
        .select({
          jobTitle: jobsTable.title,
          residentId: jobsTable.residentId,
          studentId: jobApplicationsTable.studentId,
        })
        .from(jobApplicationsTable)
        .innerJoin(jobsTable, eq(jobsTable.id, jobApplicationsTable.jobId))
        .where(eq(jobApplicationsTable.id, approval.targetId))
        .limit(1);
      if (!row) {
        res.status(404).json({ error: "This approval link is invalid." });
        return;
      }
      const [student] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, row.studentId))
        .limit(1);
      const [resident] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, row.residentId))
        .limit(1);
      if (!student || !resident) {
        res.status(404).json({ error: "This approval link is invalid." });
        return;
      }
      details = {
        targetType: approval.targetType,
        businessName: null,
        category: null,
        jobTitle: row.jobTitle,
        residentFirstName: firstName(resident.name),
        studentName: firstName(student.name),
      };
    }

    res.json(GetGuardianApprovalResponse.parse({
      ...details,
      expired: approval.expiresAt.getTime() <= Date.now(),
      used: Boolean(approval.consumedAt),
      decision: approval.decision,
    }));
  } catch (error) {
    req.log.error({ err: error }, "Could not load guardian approval");
    res.status(500).json({ error: "We couldn't load this approval link." });
  }
});

router.post("/guardian/approvals/:token", async (req, res) => {
  const params = SubmitGuardianApprovalParams.safeParse(req.params);
  const parsed = SubmitGuardianApprovalBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(404).json({ error: "This approval link is invalid." });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const digest = tokenDigest(params.data.token);
      const [approval] = await tx
        .select()
        .from(guardianApprovalsTable)
        .where(
          and(
            eq(guardianApprovalsTable.tokenHash, digest),
            isNull(guardianApprovalsTable.consumedAt),
            gt(guardianApprovalsTable.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!approval) return null;

      if (approval.targetType === "business") {
        const [business] = await tx
          .select()
          .from(businessesTable)
          .where(
            and(
              eq(businessesTable.id, approval.targetId),
              eq(businessesTable.status, "pending_guardian"),
            ),
          )
          .for("update")
          .limit(1);
        if (!business) return null;

        const now = new Date();
        const [claimedApproval] = await tx
          .update(guardianApprovalsTable)
          .set({ consumedAt: now, decision: parsed.data.decision })
          .where(
            and(
              eq(guardianApprovalsTable.id, approval.id),
              isNull(guardianApprovalsTable.consumedAt),
              gt(guardianApprovalsTable.expiresAt, now),
            ),
          )
          .returning();
        if (!claimedApproval) return null;

        const [updatedBusiness] = await tx
          .update(businessesTable)
          .set({
            status: parsed.data.decision === "approved" ? "live" : "rejected",
            rejectionReason:
              parsed.data.decision === "approved"
                ? null
                : "Guardian did not approve this business.",
            updatedAt: now,
          })
          .where(
            and(
              eq(businessesTable.id, business.id),
              eq(businessesTable.status, "pending_guardian"),
            ),
          )
          .returning();
        if (!updatedBusiness) {
          throw new Error("Approval status changed while processing.");
        }

        const [profile] = await tx
          .select()
          .from(studentProfilesTable)
          .where(eq(studentProfilesTable.userId, business.ownerId))
          .limit(1);
        const [student] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, business.ownerId))
          .limit(1);
        if (!profile || !student) {
          throw new Error("Student profile not found for guardian approval.");
        }
        return { kind: "business" as const, business: updatedBusiness, profile, student };
      }

      const [initialApplication] = await tx
        .select({ jobId: jobApplicationsTable.jobId })
        .from(jobApplicationsTable)
        .where(eq(jobApplicationsTable.id, approval.targetId))
        .limit(1);
      if (!initialApplication) return null;
      const [job] = await tx
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.id, initialApplication.jobId))
        .for("update")
        .limit(1);
      if (!job || job.status !== "open") return null;
      const [application] = await tx
        .select()
        .from(jobApplicationsTable)
        .where(
          and(
            eq(jobApplicationsTable.id, approval.targetId),
            eq(jobApplicationsTable.jobId, job.id),
            eq(jobApplicationsTable.status, "chosen"),
          ),
        )
        .for("update")
        .limit(1);
      if (!application) return null;

      const now = new Date();
      const [claimedApproval] = await tx
        .update(guardianApprovalsTable)
        .set({ consumedAt: now, decision: parsed.data.decision })
        .where(
          and(
            eq(guardianApprovalsTable.id, approval.id),
            eq(guardianApprovalsTable.targetType, "job_application"),
            isNull(guardianApprovalsTable.consumedAt),
            gt(guardianApprovalsTable.expiresAt, now),
          ),
        )
        .returning();
      if (!claimedApproval) return null;

      const [updatedApplication] = await tx
        .update(jobApplicationsTable)
        .set({
          status:
            parsed.data.decision === "approved"
              ? "guardian_approved"
              : "declined",
          updatedAt: now,
        })
        .where(eq(jobApplicationsTable.id, application.id))
        .returning();
      if (parsed.data.decision === "approved") {
        const [filledJob] = await tx
          .update(jobsTable)
          .set({ status: "filled", updatedAt: now })
          .where(
            and(eq(jobsTable.id, job.id), eq(jobsTable.status, "open")),
          )
          .returning();
        if (!filledJob) throw new Error("Job status changed during guardian approval.");

        const otherApplications = await tx
          .select({ id: jobApplicationsTable.id })
          .from(jobApplicationsTable)
          .where(
            and(
              eq(jobApplicationsTable.jobId, job.id),
              inArray(jobApplicationsTable.status, ["applied", "chosen"]),
            ),
          );
        const otherIds = otherApplications
          .map((row) => row.id)
          .filter((id) => id !== application.id);
        if (otherIds.length) {
          await tx
            .update(jobApplicationsTable)
            .set({ status: "declined", updatedAt: now })
            .where(inArray(jobApplicationsTable.id, otherIds));
          await tx
            .update(guardianApprovalsTable)
            .set({ consumedAt: now, decision: "declined" })
            .where(
              and(
                eq(guardianApprovalsTable.targetType, "job_application"),
                inArray(guardianApprovalsTable.targetId, otherIds),
                isNull(guardianApprovalsTable.consumedAt),
              ),
            );
        }
      }

      const [profile] = await tx
        .select()
        .from(studentProfilesTable)
        .where(eq(studentProfilesTable.userId, application.studentId))
        .limit(1);
      const [student] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, application.studentId))
        .limit(1);
      const [resident] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, job.residentId))
        .limit(1);
      if (!profile || !student || !resident) {
        throw new Error("A job application participant profile is unavailable.");
      }
      if (parsed.data.decision === "approved") {
        await createChatThread(tx, {
          jobApplicationId: application.id,
          studentId: student.id,
          studentEmail: student.email,
          residentId: resident.id,
          residentEmail: resident.email,
          guardianEmail: profile.guardianEmail,
          now,
        });
      }
      return {
        kind: "job_application" as const,
        job,
        application: updatedApplication,
        profile,
        student,
        resident,
      };
    });

    if (!result) {
      res.status(404).json({ error: "This approval link has expired or was already used." });
      return;
    }

    const approved = parsed.data.decision === "approved";
    if (result.kind === "business") {
      await sendEmail({
        to: [result.student.email],
        cc: [result.profile.guardianEmail],
        subject: approved
          ? `Your Launch Lane business is approved: ${result.business.name}`
          : `Launch Lane guardian decision: ${result.business.name}`,
        text: approved
          ? `Your guardian approved ${result.business.name}. Your business is now live on Launch Lane.`
          : `Your guardian did not approve ${result.business.name}. The listing is not live. You can update it in your Launch Lane dashboard and submit it for review again.`,
      });
    } else if (approved) {
      await sendEmail({
        to: [result.resident.email],
        subject: `Your job is filled: ${result.job.title}`,
        text: [
          `The guardian approved ${firstName(result.student.name)} for ${result.job.title}. The job is now filled.`,
          "",
          `Student email: ${result.student.email}`,
          "Reply directly to arrange the job details and payment.",
        ].join("\n"),
      });
      await sendEmail({
        to: [result.student.email],
        cc: [result.profile.guardianEmail],
        subject: `Guardian approved your job application: ${result.job.title}`,
        text: [
          `Your guardian approved your application for ${result.job.title}. The resident selected you.`,
          "",
          `Resident email: ${result.resident.email}`,
          "Reply directly to arrange the job details and payment.",
        ].join("\n"),
      });
    } else {
      await sendEmail({
        to: [result.resident.email],
        subject: `Guardian declined an applicant: ${result.job.title}`,
        text: `The guardian declined ${firstName(result.student.name)} for ${result.job.title}. The job remains open; you can choose another applicant from your dashboard.`,
      });
      await sendEmail({
        to: [result.student.email],
        cc: [result.profile.guardianEmail],
        subject: `Guardian decision: ${result.job.title}`,
        text: `Your guardian declined the application for ${result.job.title}. The resident may choose another applicant.`,
      });
    }
    res.json(
      SubmitGuardianApprovalResponse.parse({
        ok: true,
        decision: parsed.data.decision,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Could not record guardian business decision");
    res.status(500).json({ error: "We couldn't record that decision. Please try again." });
  }
});

export default router;
