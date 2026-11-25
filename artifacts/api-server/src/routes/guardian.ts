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
  studentProfilesTable,
  usersTable,
} from "@workspace/db";
// @ts-ignore - this module preserves the original JavaScript email delivery helper.
import { sendEmail } from "../lib/notify.js";

const router = Router();

function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

router.get("/guardian/approvals/:token", async (req, res) => {
  const params = GetGuardianApprovalParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "This approval link is invalid." });
    return;
  }
  try {
    const [row] = await db
      .select({
        approval: guardianApprovalsTable,
        business: businessesTable,
        studentName: usersTable.name,
      })
      .from(guardianApprovalsTable)
      .innerJoin(
        businessesTable,
        eq(guardianApprovalsTable.targetId, businessesTable.id),
      )
      .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
      .where(
        and(
          eq(guardianApprovalsTable.targetType, "business"),
          eq(guardianApprovalsTable.tokenHash, tokenDigest(params.data.token)),
        ),
      )
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "This approval link is invalid." });
      return;
    }
    res.json(GetGuardianApprovalResponse.parse({
      businessName: row.business.name,
      category: row.business.category,
      studentName: row.studentName.split(/\s+/)[0] || "Student",
      expired: row.approval.expiresAt.getTime() <= Date.now(),
      used: Boolean(row.approval.consumedAt),
      decision: row.approval.decision,
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
            eq(guardianApprovalsTable.targetType, "business"),
            eq(guardianApprovalsTable.tokenHash, digest),
            isNull(guardianApprovalsTable.consumedAt),
            gt(guardianApprovalsTable.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!approval) return null;

      const [business] = await tx
        .select()
        .from(businessesTable)
        .where(
          and(
            eq(businessesTable.id, approval.targetId),
            eq(businessesTable.status, "pending_guardian"),
          ),
        )
        .limit(1);
      if (!business) return null;

      const [claimedApproval] = await tx
        .update(guardianApprovalsTable)
        .set({
          consumedAt: new Date(),
          decision: parsed.data.decision,
        })
        .where(
          and(
            eq(guardianApprovalsTable.id, approval.id),
            isNull(guardianApprovalsTable.consumedAt),
            gt(guardianApprovalsTable.expiresAt, new Date()),
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
          updatedAt: new Date(),
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
      return { business: updatedBusiness, profile, student };
    });

    if (!result) {
      res.status(404).json({ error: "This approval link has expired or was already used." });
      return;
    }

    const approved = parsed.data.decision === "approved";
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
