import {
  and,
  chatMessagesTable,
  chatThreadParticipantsTable,
  chatThreadsTable,
  db,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  sql,
  usersTable,
} from "@workspace/db";
import { count } from "drizzle-orm";
import {
  bookingsTable,
  businessesTable,
  jobApplicationsTable,
  jobsTable,
  type User,
} from "@workspace/db";
import type { AccountContext } from "./authorization";

export type AccessibleThread = {
  thread: typeof chatThreadsTable.$inferSelect;
  participant: typeof chatThreadParticipantsTable.$inferSelect | null;
};

function participantFilter(account: AccountContext) {
  if (account.user.role === "student" || account.user.role === "resident") {
    return and(
      eq(chatThreadParticipantsTable.userId, account.user.id),
      eq(chatThreadParticipantsTable.role, account.user.role),
    );
  }
  if (account.user.role === "guardian") {
    return and(
      eq(chatThreadParticipantsTable.role, "guardian"),
      sql`lower(${chatThreadParticipantsTable.email}) = ${account.identity.email.toLowerCase()}`,
    );
  }
  return null;
}

async function bindGuardianParticipant(
  participant: typeof chatThreadParticipantsTable.$inferSelect,
  account: AccountContext,
) {
  if (account.user.role !== "guardian") return participant;
  if (
    participant.userId !== null &&
    participant.userId !== account.user.id
  ) {
    return null;
  }
  if (participant.userId === null) {
    const [updated] = await db
      .update(chatThreadParticipantsTable)
      .set({ userId: account.user.id })
      .where(
        and(
          eq(chatThreadParticipantsTable.id, participant.id),
          isNull(chatThreadParticipantsTable.userId),
        ),
      )
      .returning();
    return updated ?? null;
  }
  return participant;
}

export async function getAccessibleThread(
  threadId: string,
  account: AccountContext,
): Promise<AccessibleThread | null> {
  const [thread] = await db
    .select()
    .from(chatThreadsTable)
    .where(eq(chatThreadsTable.id, threadId))
    .limit(1);
  if (!thread) return null;
  if (account.user.role === "admin") return { thread, participant: null };

  const filter = participantFilter(account);
  if (!filter) return null;
  const [initial] = await db
    .select()
    .from(chatThreadParticipantsTable)
    .where(and(eq(chatThreadParticipantsTable.threadId, thread.id), filter))
    .limit(1);
  if (!initial) return null;
  const participant = await bindGuardianParticipant(initial, account);
  return participant ? { thread, participant } : null;
}

async function listAccessibleThreads(
  account: AccountContext,
): Promise<AccessibleThread[]> {
  if (account.user.role === "admin") {
    const threads = await db
      .select()
      .from(chatThreadsTable)
      .orderBy(desc(chatThreadsTable.updatedAt));
    return threads.map((thread) => ({ thread, participant: null }));
  }

  const filter = participantFilter(account);
  if (!filter) return [];
  const participants = await db
    .select()
    .from(chatThreadParticipantsTable)
    .where(filter);
  const boundParticipants = (
    await Promise.all(
      participants.map((participant) =>
        bindGuardianParticipant(participant, account),
      ),
    )
  ).filter(
    (participant): participant is typeof chatThreadParticipantsTable.$inferSelect =>
      participant !== null,
  );
  const threadIds = boundParticipants.map((participant) => participant.threadId);
  if (!threadIds.length) return [];
  const threads = await db
    .select()
    .from(chatThreadsTable)
    .where(inArray(chatThreadsTable.id, threadIds))
    .orderBy(desc(chatThreadsTable.updatedAt));
  const participantByThread = new Map(
    boundParticipants.map((participant) => [participant.threadId, participant]),
  );
  return threads.map((thread) => ({
    thread,
    participant: participantByThread.get(thread.id) ?? null,
  }));
}

async function getThreadTitle(thread: typeof chatThreadsTable.$inferSelect) {
  if (thread.bookingId) {
    const [row] = await db
      .select({ title: businessesTable.name })
      .from(bookingsTable)
      .innerJoin(businessesTable, eq(businessesTable.id, bookingsTable.businessId))
      .where(eq(bookingsTable.id, thread.bookingId))
      .limit(1);
    return row?.title ?? "Booking conversation";
  }
  if (thread.jobApplicationId) {
    const [row] = await db
      .select({ title: jobsTable.title })
      .from(jobApplicationsTable)
      .innerJoin(jobsTable, eq(jobsTable.id, jobApplicationsTable.jobId))
      .where(eq(jobApplicationsTable.id, thread.jobApplicationId))
      .limit(1);
    return row?.title ?? "Job conversation";
  }
  return "Launch Lane conversation";
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Neighbor";
}

async function threadSummary(
  item: AccessibleThread,
  account: AccountContext,
) {
  const { thread, participant } = item;
  const [student, resident] = await Promise.all([
    db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, thread.studentId))
      .limit(1),
    db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, thread.residentId))
      .limit(1),
  ]);
  const [latest] = await db
    .select({
      text: chatMessagesTable.text,
      deletedAt: chatMessagesTable.deletedAt,
    })
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.threadId, thread.id))
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(1);

  let unreadCount = 0;
  if (participant && participant.userId) {
    const [unread] = await db
      .select({ count: count() })
      .from(chatMessagesTable)
      .where(
        and(
          eq(chatMessagesTable.threadId, thread.id),
          ne(chatMessagesTable.senderId, account.user.id),
          participant.lastReadAt
            ? gt(chatMessagesTable.createdAt, participant.lastReadAt)
            : sql`true`,
        ),
      );
    unreadCount = Number(unread?.count ?? 0);
  }

  return {
    id: thread.id,
    sourceType: thread.bookingId ? "booking" : "job_application",
    title: await getThreadTitle(thread),
    studentFirstName: firstName(student[0]?.name ?? "Student"),
    residentFirstName: firstName(resident[0]?.name ?? "Neighbor"),
    updatedAt: thread.updatedAt.toISOString(),
    latestMessage: latest
      ? latest.deletedAt
        ? "[Message removed by Launch Lane]"
        : latest.text
      : null,
    unreadCount,
    locked: thread.locked,
  };
}

export async function listChatThreadSummaries(account: AccountContext) {
  const items = await listAccessibleThreads(account);
  return Promise.all(items.map((item) => threadSummary(item, account)));
}

export async function listThreadsForGuardianStudent(
  studentId: string,
  account: AccountContext,
) {
  const summaries = await listChatThreadSummaries(account);
  const threads = await db
    .select({ id: chatThreadsTable.id })
    .from(chatThreadsTable)
    .where(eq(chatThreadsTable.studentId, studentId));
  const allowed = new Set(threads.map((row) => row.id));
  return summaries.filter((summary) => allowed.has(summary.id));
}

export function roleLabel(role: User["role"]) {
  if (role === "guardian") return "Parent";
  if (role === "admin") return "Launch Lane";
  return role === "student" ? "Student" : "Resident";
}

export function firstNameForChat(name: string) {
  return firstName(name);
}
