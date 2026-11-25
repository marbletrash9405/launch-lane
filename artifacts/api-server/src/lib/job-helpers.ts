import { desc, inArray, eq, and, notInArray } from "drizzle-orm";
import {
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
  status: typeof jobApplicationsTable.$inferSelect.status;
  createdAt: string;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Student";
}

function toResidentJob(job: Job, applications: ApplicantSummary[]) {
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
      status: row.application.status,
      createdAt: row.application.createdAt.toISOString(),
    });
    map.set(row.application.jobId, current);
  }
  return map;
}

export async function listResidentJobs(residentId: string) {
  const rows = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.residentId, residentId))
    .orderBy(desc(jobsTable.createdAt));
  const applicants = await getApplicantMap(rows.map((row) => row.id));
  return rows.map((job) => toResidentJob(job, applicants.get(job.id) ?? []));
}

export async function getResidentJob(jobId: string) {
  const [job] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId))
    .limit(1);
  if (!job) return null;
  const applicants = await getApplicantMap([job.id]);
  return toResidentJob(job, applicants.get(job.id) ?? []);
}

function toAdminJob(
  job: Job,
  residentName: string,
  residentEmail: string,
  privateAddress: string,
  residentStreetName: string | null,
  applications: ApplicantSummary[],
) {
  return {
    ...toResidentJob(job, applications),
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
      privateAddress: residentProfilesTable.homeAddress,
      residentStreetName: residentProfilesTable.streetName,
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(usersTable.id, jobsTable.residentId))
    .innerJoin(
      residentProfilesTable,
      eq(residentProfilesTable.userId, jobsTable.residentId),
    )
    .where(eq(jobsTable.id, jobId))
    .limit(1);
  if (!row) return null;
  const applicants = await getApplicantMap([row.job.id]);
  return toAdminJob(
    row.job,
    row.residentName,
    row.residentEmail,
    row.privateAddress,
    row.residentStreetName,
    applicants.get(row.job.id) ?? [],
  );
}

export async function listAdminJobs() {
  const rows = await db
    .select({
      job: jobsTable,
      residentName: usersTable.name,
      residentEmail: usersTable.email,
      privateAddress: residentProfilesTable.homeAddress,
      residentStreetName: residentProfilesTable.streetName,
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(usersTable.id, jobsTable.residentId))
    .innerJoin(
      residentProfilesTable,
      eq(residentProfilesTable.userId, jobsTable.residentId),
    )
    .orderBy(desc(jobsTable.createdAt));
  const applicants = await getApplicantMap(rows.map((row) => row.job.id));
  return rows.map((row) =>
    toAdminJob(
      row.job,
      row.residentName,
      row.residentEmail,
      row.privateAddress,
      row.residentStreetName,
      applicants.get(row.job.id) ?? [],
    ),
  );
}
