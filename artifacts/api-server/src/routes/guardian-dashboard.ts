import { Router } from "express";
import {
  bookingsTable,
  businessesTable,
  chatThreadsTable,
  db,
  desc,
  eq,
  inArray,
  jobApplicationsTable,
  jobsTable,
  sql,
  studentProfilesTable,
  usersTable,
} from "@workspace/db";
import { GetGuardianDashboardResponse as GuardianDashboardSchema } from "@workspace/api-zod";
import {
  getAccount,
  requireAccount,
  requireRole,
  requireSignedIn,
} from "../lib/authorization";
import { listChatThreadSummaries } from "../lib/chat-data";

const router = Router();
const guardianAccess = [
  requireSignedIn,
  requireAccount,
  requireRole("guardian"),
];

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Student";
}

function photoUrl(path: string) {
  return `/api/storage/objects/${path.replace(/^\/objects\//, "")}`;
}

router.get(
  "/guardian/dashboard",
  ...guardianAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    try {
      const linked = await db
        .select({
          userId: usersTable.id,
          name: usersTable.name,
          age: studentProfilesTable.age,
        })
        .from(studentProfilesTable)
        .innerJoin(usersTable, eq(usersTable.id, studentProfilesTable.userId))
        .where(
          sql`lower(${studentProfilesTable.guardianEmail}) = ${account.identity.email.toLowerCase()}`,
        );
      if (!linked.length) {
        res.json(GuardianDashboardSchema.parse({ students: [] }));
        return;
      }

      const studentIds = linked.map((student) => student.userId);
      const [businessRows, bookingRows, applicationRows, chatSummaries, chatThreadRows] =
        await Promise.all([
          db
            .select()
            .from(businessesTable)
            .where(inArray(businessesTable.ownerId, studentIds))
            .orderBy(desc(businessesTable.updatedAt)),
          db
            .select({
              booking: bookingsTable,
              businessName: businessesTable.name,
              studentId: businessesTable.ownerId,
            })
            .from(bookingsTable)
            .innerJoin(
              businessesTable,
              eq(businessesTable.id, bookingsTable.businessId),
            )
            .where(inArray(businessesTable.ownerId, studentIds))
            .orderBy(desc(bookingsTable.createdAt)),
          db
            .select({
              application: jobApplicationsTable,
              jobTitle: jobsTable.title,
            })
            .from(jobApplicationsTable)
            .innerJoin(jobsTable, eq(jobsTable.id, jobApplicationsTable.jobId))
            .where(inArray(jobApplicationsTable.studentId, studentIds))
            .orderBy(desc(jobApplicationsTable.createdAt)),
          listChatThreadSummaries(account),
          db
            .select({
              id: chatThreadsTable.id,
              studentId: chatThreadsTable.studentId,
            })
            .from(chatThreadsTable)
            .where(inArray(chatThreadsTable.studentId, studentIds)),
        ]);

      const threadOwner = new Map(
        chatThreadRows.map((thread) => [thread.id, thread.studentId]),
      );
      const businessesByStudent = new Map<string, typeof businessRows>();
      for (const business of businessRows) {
        const current = businessesByStudent.get(business.ownerId) ?? [];
        current.push(business);
        businessesByStudent.set(business.ownerId, current);
      }
      const bookingsByStudent = new Map<string, typeof bookingRows>();
      for (const booking of bookingRows) {
        const current = bookingsByStudent.get(booking.studentId) ?? [];
        current.push(booking);
        bookingsByStudent.set(booking.studentId, current);
      }
      const applicationsByStudent = new Map<string, typeof applicationRows>();
      for (const application of applicationRows) {
        const current =
          applicationsByStudent.get(application.application.studentId) ?? [];
        current.push(application);
        applicationsByStudent.set(application.application.studentId, current);
      }

      res.json(
        GuardianDashboardSchema.parse({
          students: linked.map((student) => ({
            studentId: student.userId,
            firstName: firstName(student.name),
            age: student.age,
            businesses: (businessesByStudent.get(student.userId) ?? []).map(
              (business) => ({
                id: business.id,
                name: business.name,
                category: business.category,
                description: business.description,
                pricingText: business.pricingText,
                photoUrls: business.photoPaths.map(photoUrl),
                status: business.status,
                updatedAt: business.updatedAt.toISOString(),
              }),
            ),
            bookings: (bookingsByStudent.get(student.userId) ?? []).map(
              ({ booking, businessName }) => ({
                id: booking.id,
                businessName,
                status: booking.status,
                createdAt: booking.createdAt.toISOString(),
              }),
            ),
            jobApplications: (
              applicationsByStudent.get(student.userId) ?? []
            ).map(({ application, jobTitle }) => ({
              id: application.id,
              jobTitle,
              status: application.status,
              createdAt: application.createdAt.toISOString(),
            })),
            chats: chatSummaries.filter(
              (thread) => threadOwner.get(thread.id) === student.userId,
            ),
          })),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not load guardian dashboard");
      res.status(500).json({ error: "We couldn't load the linked student accounts." });
    }
  },
);

export default router;
