// Run manually in development only. Never imported by the application.
import {
  db, pool, usersTable, studentProfilesTable, residentProfilesTable,
  businessesTable, jobsTable, jobApplicationsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
// @ts-ignore - shared JavaScript email helper.
import { sendNotification } from "../lib/notify.js";

const ids = {
  resident: "bbee0000-0000-4000-8000-000000000001",
  studentA: "bbee0000-0000-4000-8000-000000000002",
  studentB: "bbee0000-0000-4000-8000-000000000003",
  business: "bbee0000-0000-4000-8000-000000000004",
  jobA: "bbee0000-0000-4000-8000-000000000005",
  jobB: "bbee0000-0000-4000-8000-000000000006",
  applicationA: "bbee0000-0000-4000-8000-000000000007",
  applicationB: "bbee0000-0000-4000-8000-000000000008",
};

async function main() {
  if (process.argv.includes("--confirm-development-test-data") === false) {
    throw new Error("Pass --confirm-development-test-data to create synthetic review fixtures.");
  }
  const notices = await db.transaction(async (tx) => {
    await tx.insert(usersTable).values([
      { id: ids.resident, authId: "fixture-review-resident", email: "resident@launch-lane-test.invalid", name: "Taylor TEST Resident", role: "resident" },
      { id: ids.studentA, authId: "fixture-review-student-a", email: "alex@launch-lane-test.invalid", name: "Alex TEST Student", role: "student" },
      { id: ids.studentB, authId: "fixture-review-student-b", email: "sam@launch-lane-test.invalid", name: "Sam TEST Student", role: "student" },
    ]).onConflictDoNothing();
    await tx.insert(residentProfilesTable).values({
      userId: ids.resident,
      homeAddress: "TEST ADDRESS ONLY — not a real home, Mercer Crossing",
      streetName: "TEST Street",
    }).onConflictDoNothing();
    await tx.insert(studentProfilesTable).values([
      { userId: ids.studentA, age: 16, homeAddress: "TEST ADDRESS ONLY — Student A, Mercer Crossing", guardianName: "Jordan TEST Guardian", guardianEmail: "guardian-a@launch-lane-test.invalid" },
      { userId: ids.studentB, age: 17, homeAddress: "TEST ADDRESS ONLY — Student B, Mercer Crossing", guardianName: "Casey TEST Guardian", guardianEmail: "guardian-b@launch-lane-test.invalid" },
    ]).onConflictDoNothing();
    const createdBusiness = await tx.insert(businessesTable).values({
      id: ids.business, ownerId: ids.studentA,
      name: "[TEST] Alex's bin cleaning", category: "Bin cleaning",
      description: "Synthetic review example, not a real service. Bin cleaning after collection. Use this to try Approve or Reject.",
      pricingText: "TEST ONLY — $10 per bin", status: "pending_review",
    }).onConflictDoNothing().returning();
    const createdJobs = await tx.insert(jobsTable).values([
      { id: ids.jobA, residentId: ids.resident, title: "[TEST] Weekend lawn help", category: "Lawn care", description: "Synthetic review example, not a real job. Help with mowing and sweeping. Approve this job before reviewing its sample application.", timing: "TEST ONLY — Saturday afternoon", payText: "TEST ONLY — $25", status: "pending_review" as const },
      { id: ids.jobB, residentId: ids.resident, title: "[TEST] Math tutoring request", category: "Tutoring", description: "Synthetic review example, not a real job. One hour of algebra practice. Approve this job before reviewing its sample application.", timing: "TEST ONLY — weekday after school", payText: "TEST ONLY — $20 per hour", status: "pending_review" as const },
    ]).onConflictDoNothing().returning();
    const createdApplications = await tx.insert(jobApplicationsTable).values([
      { id: ids.applicationA, jobId: ids.jobA, studentId: ids.studentA, message: "TEST APPLICATION — I have helped with yard work and can bring gloves. This is synthetic data for testing admin review only.", status: "pending_review" as const },
      { id: ids.applicationB, jobId: ids.jobB, studentId: ids.studentB, message: "TEST APPLICATION — I enjoy algebra and can explain practice problems step by step. This is synthetic data for testing admin review only.", status: "pending_review" as const },
    ]).onConflictDoNothing().returning();
    return [
      ...createdBusiness.map(item => ({ subject: `Business review needed: ${item.name}`, summary: item.description, label: item.name })),
      ...createdJobs.map(item => ({ subject: `Job review needed: ${item.title}`, summary: item.description, label: item.title })),
      ...createdApplications.map(item => ({ subject: `Application review needed: ${item.jobId === ids.jobA ? "[TEST] Weekend lawn help" : "[TEST] Math tutoring request"}`, summary: item.message, label: item.jobId === ids.jobA ? "Alex, age 16" : "Sam, age 17" })),
    ];
  });
  logger.info({ created: notices.length }, "Created synthetic admin review entries (all pending; none public)");
  for (const notice of notices) {
    const result = await sendNotification({
      subject: notice.subject,
      intro: "TEST ONLY: A synthetic entry was added to your Launch Lane admin review queue.",
      rows: [
        ["Entry", notice.label], ["Details", notice.summary],
        ["Review", "Open your Launch Lane preview at /admin. All test entries start pending review."],
        ["Safety", "All names and addresses are synthetic. Emails to .invalid test accounts are logged only."],
      ],
    });
    logger.info({ status: result.status, emailId: result.id }, "Test review notification result");
    if (result.status !== "sent") {
      logger.warn("Email delivery is not working yet; stopped further attempts. Review the admin Email log.");
      break;
    }
  }
}

try { await main(); }
finally { await pool.end(); }
