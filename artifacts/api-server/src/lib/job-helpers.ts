import { desc, inArray, eq, and, notInArray } from "drizzle-orm";
import {
  businessesTable,
  db,
  jobApplicationsTable,
  jobsTable,
  residentProfilesTable,
  studentProfilesTable,
  usersTable,
  type Job,
} from "@workspace/db";

type ApplicantSummary = {
  id: string;
  studentFirstName: string;
  age: number;
  message: string;
  hasOtherJob: boolean;
  otherJobDetails: string | null;
  availability: string | null;
  status: typeof jobApplicationsTable.$inferSelect.status;
  createdAt: string;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Student";
}

function toResidentJob(job: Job, applications: ApplicantSummary[], businessName: string | null = null) {
  return {
    id: job.id,
    title: job.title,
    category: job.category,
    description: job.description,
    timing: job.timing,
    payText: job.payText,
    status: job.status,
    rejectionReason: job.rejectionReason,
    applications,
    businessId: job.businessId ?? null,
    businessName: job.businessId ? businessName : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

async function getApplicantMap(jobIds: string[]) {
  const map = new Map<string, ApplicantSummary[]>();
  if (jobIds.length === 0) return map;

  const rows = await db
    .select({
      application: jobApplicationsTable,
      studentName: usersTable.name,
      age: studentProfilesTable.age,
    })
    .from(jobApplicationsTable)
    .innerJoin(usersTable, eq(usersTable.id, jobApplicationsTable.studentId))
    .innerJoin(
      studentProfilesTable,
      eq(studentProfilesTable.userId, jobApplicationsTable.studentId),
    )
    .where(
      and(
        inArray(jobApplicationsTable.jobId, jobIds),
        notInArray(jobApplicationsTable.status, ["pending_review", "rejected"]),
      ),
    )
    .orderBy(desc(jobApplicationsTable.createdAt));

  for (const row of rows) {
    const current = map.get(row.application.jobId) ?? [];
    current.push({
      id: row.application.id,
      studentFirstName: firstName(row.studentName),
      age: row.age,
      message: row.application.message,
      hasOtherJob: row.application.hasOtherJob,
      otherJobDetails: row.application.otherJobDetails,
      availability: row.application.availability,
      status: row.application.status,
      createdAt: row.application.createdAt.toISOString(),
    });
    map.set(row.application.jobId, current);
  }
  return map;
}

/** Jobs a resident posted, or openings a student owner posted for their businesses. */
export async function listResidentJobs(residentId: string) {
  const rows = await db
    .select({ job: jobsTable, businessName: businessesTable.name })
    .from(jobsTable)
    .leftJoin(businessesTable, eq(businessesTable.id, jobsTable.businessId))
    .where(eq(jobsTable.residentId, residentId))
    .orderBy(desc(jobsTable.createdAt));
  const applicants = await getApplicantMap(rows.map((row) => row.job.id));
  return rows.map((row) =>
    toResidentJob(row.job, applicants.get(row.job.id) ?? [], row.businessName),
  );
}

export async function getResidentJob(jobId: string) {
  const [row] = await db
    .select({ job: jobsTable, businessName: businessesTable.name })
    .from(jobsTable)
    .leftJoin(businessesTable, eq(businessesTable.id, jobsTable.businessId))
    .where(eq(jobsTable.id, jobId))
    .limit(1);
  if (!row) return null;
  const applicants = await getApplicantMap([row.job.id]);
  return toResidentJob(row.job, applicants.get(row.job.id) ?? [], row.businessName);
}

/**
 * Who to email about a job: the poster, plus their guardian when the poster
 * is a student (business openings), since every email to a student copies
 * their guardian.
 */
export async function getPosterContact(posterId: string) {
  const [row] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      guardianEmail: studentProfilesTable.guardianEmail,
    })
    .from(usersTable)
    .leftJoin(studentProfilesTable, eq(studentProfilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, posterId))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    guardianEmail: row.guardianEmail ?? null,
    cc: row.guardianEmail ? [row.guardianEmail] : [],
  };
}

type AdminJobRow = {
  job: Job;
  residentName: string;
  residentEmail: string;
  residentAddress: string | null;
  ownerAddress: string | null;
  residentStreetName: string | null;
  businessName: string | null;
};

function toAdminJob(row: AdminJobRow, applications: ApplicantSummary[]) {
  return toAdminJobFields(
    row.job,
    row.residentName,
    row.residentEmail,
    row.residentAddress ?? row.ownerAddress ?? "",
    row.residentStreetName,
    applications,
    row.businessName,
  );
}

function toAdminJobFields(
  job: Job,
  residentName: string,
  residentEmail: string,
  privateAddress: string,
  residentStreetName: string | null,
  applications: ApplicantSummary[],
  businessName: string | null,
) {
  return {
    ...toResidentJob(job, applications, businessName),
    residentName,
    residentEmail,
    privateAddress,
    residentStreetName,
  };
}

export async function getAdminJob(jobId: string) {
  const [row] = await db
    .select({
      job: jobsTable,
      residentName: usersTable.name,
      residentEmail: usersTable.email,
      residentAddress: residentProfilesTable.homeAddress,
      ownerAddress: studentProfilesTable.homeAddress,
      residentStreetName: residentProfilesTable.streetName,
      businessName: businessesTable.name,
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(usersTable.id, jobsTable.residentId))
    .leftJoin(
      residentProfilesTable,
      eq(residentProfilesTable.userId, jobsTable.residentId),
    )
    .leftJoin(
      studentProfilesTable,
      eq(studentProfilesTable.userId, jobsTable.residentId),
    )
    .leftJoin(businessesTable, eq(businessesTable.id, jobsTable.businessId))
    .where(eq(jobsTable.id, jobId))
    .limit(1);
  if (!row) return null;
  const applicants = await getApplicantMap([row.job.id]);
  return toAdminJob(row, applicants.get(row.job.id) ?? []);
}

export async function listAdminJobs() {
  const rows = await db
    .select({
      job: jobsTable,
      residentName: usersTable.name,
      residentEmail: usersTable.email,
      residentAddress: residentProfilesTable.homeAddress,
      ownerAddress: studentProfilesTable.homeAddress,
      residentStreetName: residentProfilesTable.streetName,
      businessName: businessesTable.name,
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(usersTable.id, jobsTable.residentId))
    .leftJoin(
      residentProfilesTable,
      eq(residentProfilesTable.userId, jobsTable.residentId),
    )
    .leftJoin(
      studentProfilesTable,
      eq(studentProfilesTable.userId, jobsTable.residentId),
    )
    .leftJoin(businessesTable, eq(businessesTable.id, jobsTable.businessId))
    .orderBy(desc(jobsTable.createdAt));
  const applicants = await getApplicantMap(rows.map((row) => row.job.id));
  return rows.map((row) => toAdminJob(row, applicants.get(row.job.id) ?? []));
}
