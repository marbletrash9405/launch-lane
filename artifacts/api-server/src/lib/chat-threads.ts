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
    await tx.insert(chatThreadParticipantsTable).values([
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
        role: "resident",
        lastReadAt: now,
      },
      {
        threadId: thread.id,
        userId: null,
        email: input.guardianEmail.trim().toLowerCase(),
        role: "guardian",
        lastReadAt: now,
      },
    ]);
  }
  return thread.id;
}
