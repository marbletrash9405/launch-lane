import {
  chatThreadParticipantsTable,
  chatThreadsTable,
  db,
  eq,
} from "@workspace/db";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type CreateThreadInput = {
  bookingId?: string;
  jobApplicationId?: string;
  studentId: string;
  studentEmail: string;
  residentId: string;
  residentEmail: string;
  guardianEmail: string;
  /** "student" when the poster is a student business owner (openings). */
  residentRole?: "resident" | "student";
  /** The business owner's guardian, for openings. */
  posterGuardianEmail?: string | null;
  now?: Date;
};

export async function createChatThread(
  tx: Transaction,
  input: CreateThreadInput,
) {
  const now = input.now ?? new Date();
  const values = {
    bookingId: input.bookingId ?? null,
    jobApplicationId: input.jobApplicationId ?? null,
    studentId: input.studentId,
    residentId: input.residentId,
    guardianEmail: input.guardianEmail.trim().toLowerCase(),
    createdAt: now,
    updatedAt: now,
  };

  const [created] = await tx
    .insert(chatThreadsTable)
    .values(values)
    .onConflictDoNothing()
    .returning();
  const thread =
    created ??
    (input.bookingId
      ? (
          await tx
            .select()
            .from(chatThreadsTable)
            .where(eq(chatThreadsTable.bookingId, input.bookingId))
            .limit(1)
        )[0]
      : (
          await tx
            .select()
            .from(chatThreadsTable)
            .where(eq(chatThreadsTable.jobApplicationId, input.jobApplicationId!))
            .limit(1)
        )[0]);
  if (!thread) throw new Error("The chat thread could not be created.");
  if (created) {
    const rows: (typeof chatThreadParticipantsTable.$inferInsert)[] = [
      {
        threadId: thread.id,
        userId: input.studentId,
        email: input.studentEmail.trim().toLowerCase(),
        role: "student",
        lastReadAt: now,
      },
      {
        threadId: thread.id,
        userId: input.residentId,
        email: input.residentEmail.trim().toLowerCase(),
        role: input.residentRole ?? "resident",
        lastReadAt: now,
      },
      {
        threadId: thread.id,
        userId: null,
        email: input.guardianEmail.trim().toLowerCase(),
        role: "guardian",
        lastReadAt: now,
      },
    ];
    const posterGuardian = input.posterGuardianEmail?.trim().toLowerCase();
    // Siblings can share a guardian; each email joins a thread only once.
    if (posterGuardian && !rows.some((row) => row.email === posterGuardian)) {
      rows.push({
        threadId: thread.id,
        userId: null,
        email: posterGuardian,
        role: "guardian",
        lastReadAt: now,
      });
    }
    await tx.insert(chatThreadParticipantsTable).values(rows);
  }
  return thread.id;
}
