import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  CreateChatMessageBody,
  CreateChatMessageParams,
  CreateChatMessageResponse,
  DeleteAdminChatMessageParams,
  DeleteAdminChatMessageResponse,
  GetAdminChatReportsResponse,
  GetChatThreadParams,
  GetChatThreadResponse,
  GetChatThreadsResponse,
  GetChatUnreadCountResponse,
  MarkChatThreadReadParams,
  MarkChatThreadReadResponse,
  ReportChatMessageBody,
  ReportChatMessageParams,
  ReportChatMessageResponse,
  SetAdminChatThreadLockBody,
  SetAdminChatThreadLockParams,
  SetAdminChatThreadLockResponse,
} from "@workspace/api-zod";
import {
  and,
  chatMessageReportsTable,
  chatMessagesTable,
  chatThreadParticipantsTable,
  chatThreadsTable,
  db,
  desc,
  eq,
  usersTable,
} from "@workspace/db";
import {
  getAccount,
  requireAccount,
  requireRole,
  requireSignedIn,
} from "../lib/authorization";
import {
  firstNameForChat,
  getAccessibleThread,
  listChatThreadSummaries,
  roleLabel,
} from "../lib/chat-data";
// @ts-ignore - this module preserves the JavaScript email delivery helper.
import { sendEmail, sendNotification } from "../lib/notify.js";
import { getPublicOrigin } from "../lib/public-origin";

const router = Router();
const signedInAccess = [requireSignedIn, requireAccount];
const adminAccess = [...signedInAccess, requireRole("admin")];
const messageRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Please wait before sending another message." });
  },
});

function messageShape(row: {
  message: typeof chatMessagesTable.$inferSelect;
  senderName: string;
}) {
  return {
    id: row.message.id,
    senderFirstName: firstNameForChat(row.senderName),
    senderRole: row.message.senderRole,
    text: row.message.deletedAt
      ? "[Message removed by Launch Lane]"
      : row.message.text,
    createdAt: row.message.createdAt.toISOString(),
    deletedAt: row.message.deletedAt?.toISOString() ?? null,
  };
}

function notificationDue(lastNotifiedAt: Date | null, now: Date) {
  return !lastNotifiedAt || lastNotifiedAt.getTime() <= now.getTime() - 60 * 60 * 1000;
}

async function reserveUnreadNotifications(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  threadId: string,
  senderId: string,
  now: Date,
) {
  const participants = await tx
    .select()
    .from(chatThreadParticipantsTable)
    .where(eq(chatThreadParticipantsTable.threadId, threadId))
    .for("update");
  const senderParticipant = participants.find(
    (participant) => participant.userId === senderId,
  );
  if (senderParticipant) {
    await tx
      .update(chatThreadParticipantsTable)
      .set({ lastReadAt: now })
      .where(eq(chatThreadParticipantsTable.id, senderParticipant.id));
    senderParticipant.lastReadAt = now;
  }

  const processed = new Set<string>();
  const notifications: { to: string; cc: string[] }[] = [];
  for (const participant of participants) {
    if (
      processed.has(participant.id) ||
      participant.userId === senderId ||
      (participant.lastReadAt !== null &&
        participant.lastReadAt.getTime() >= now.getTime())
    ) {
      continue;
    }
    if (!notificationDue(participant.lastNotifiedAt, now)) continue;

    if (participant.role === "student") {
      const guardian = participants.find(
        (candidate) =>
          candidate.role === "guardian" &&
          candidate.userId !== senderId,
      );
      const ccGuardian = guardian && notificationDue(guardian.lastNotifiedAt, now);
      notifications.push({
        to: participant.email,
        cc: ccGuardian ? [guardian.email] : [],
      });
      await tx
        .update(chatThreadParticipantsTable)
        .set({ lastNotifiedAt: now })
        .where(eq(chatThreadParticipantsTable.id, participant.id));
      processed.add(participant.id);
      if (guardian && ccGuardian) {
        await tx
          .update(chatThreadParticipantsTable)
          .set({ lastNotifiedAt: now })
          .where(eq(chatThreadParticipantsTable.id, guardian.id));
        processed.add(guardian.id);
      }
      continue;
    }

    notifications.push({ to: participant.email, cc: [] });
    await tx
      .update(chatThreadParticipantsTable)
      .set({ lastNotifiedAt: now })
      .where(eq(chatThreadParticipantsTable.id, participant.id));
    processed.add(participant.id);
  }
  return notifications;
}

router.get("/messages", ...signedInAccess, async (req, res): Promise<void> => {
  try {
    const threads = await listChatThreadSummaries(getAccount(res));
    res.json(GetChatThreadsResponse.parse({ threads }));
  } catch (error) {
    req.log.error({ err: error }, "Could not load chat threads");
    res.status(500).json({ error: "We couldn't load your conversations." });
  }
});

router.get(
  "/messages/unread-count",
  ...signedInAccess,
  async (req, res): Promise<void> => {
    try {
      const threads = await listChatThreadSummaries(getAccount(res));
      res.json(
        GetChatUnreadCountResponse.parse({
          unreadCount: threads.reduce((total, thread) => total + thread.unreadCount, 0),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not load unread message count");
      res.status(500).json({ error: "We couldn't check for unread messages." });
    }
  },
);

router.get(
  "/messages/:threadId",
  ...signedInAccess,
  async (req, res): Promise<void> => {
    const params = GetChatThreadParams.safeParse(req.params);
    if (!params.success) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }
    const account = getAccount(res);
    try {
      const access = await getAccessibleThread(params.data.threadId, account);
      if (!access) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      const [threadSummary] = (await listChatThreadSummaries(account)).filter(
        (thread) => thread.id === access.thread.id,
      );
      const rows = await db
        .select({
          message: chatMessagesTable,
          senderName: usersTable.name,
        })
        .from(chatMessagesTable)
        .innerJoin(usersTable, eq(usersTable.id, chatMessagesTable.senderId))
        .where(eq(chatMessagesTable.threadId, access.thread.id))
        .orderBy(chatMessagesTable.createdAt);
      res.json(
        GetChatThreadResponse.parse({
          thread: threadSummary,
          messages: rows.map(messageShape),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not load chat messages");
      res.status(500).json({ error: "We couldn't load this conversation." });
    }
  },
);

router.post(
  "/messages/:threadId/read",
  ...signedInAccess,
  async (req, res): Promise<void> => {
    const params = MarkChatThreadReadParams.safeParse(req.params);
    if (!params.success) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }
    try {
      const access = await getAccessibleThread(params.data.threadId, getAccount(res));
      if (!access) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      if (access.participant) {
        await db
          .update(chatThreadParticipantsTable)
          .set({ lastReadAt: new Date() })
          .where(eq(chatThreadParticipantsTable.id, access.participant.id));
      }
      res.json(MarkChatThreadReadResponse.parse({ ok: true }));
    } catch (error) {
      req.log.error({ err: error }, "Could not mark chat thread as read");
      res.status(500).json({ error: "We couldn't update this conversation." });
    }
  },
);

router.post(
  "/messages/:threadId",
  ...signedInAccess,
  messageRateLimiter,
  async (req, res): Promise<void> => {
    const params = CreateChatMessageParams.safeParse(req.params);
    const parsed = CreateChatMessageBody.safeParse(req.body);
    if (!params.success || !parsed.success || !parsed.data.text.trim()) {
      res.status(400).json({ error: "Enter a message of 1 to 1,000 characters." });
      return;
    }
    const account = getAccount(res);
    try {
      const access = await getAccessibleThread(params.data.threadId, account);
      if (!access) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      const now = new Date();
      const result = await db.transaction(async (tx) => {
        const [thread] = await tx
          .select()
          .from(chatThreadsTable)
          .where(eq(chatThreadsTable.id, access.thread.id))
          .for("update")
          .limit(1);
        if (!thread) return { kind: "not_found" as const };
        if (thread.locked) return { kind: "locked" as const };
        const [message] = await tx
          .insert(chatMessagesTable)
          .values({
            threadId: thread.id,
            senderId: account.user.id,
            senderRole: account.user.role,
            text: parsed.data.text.trim(),
            createdAt: now,
          })
          .returning();
        await tx
          .update(chatThreadsTable)
          .set({ updatedAt: now })
          .where(eq(chatThreadsTable.id, thread.id));
        const notifications = await reserveUnreadNotifications(
          tx,
          thread.id,
          account.user.id,
          now,
        );
        return { kind: "created" as const, message, notifications, threadId: thread.id };
      });
      if (result.kind === "not_found") {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      if (result.kind === "locked") {
        res.status(409).json({ error: "This conversation is locked by Launch Lane." });
        return;
      }

      const threadUrl = `${getPublicOrigin({
        publicAppUrl: process.env.PUBLIC_APP_URL,
        forwardedHost: req.get("x-forwarded-host"),
        host: req.get("host"),
        forwardedProtocol: req.get("x-forwarded-proto"),
      })}/messages/${result.threadId}`;
      for (const notification of result.notifications) {
        await sendEmail({
          to: [notification.to],
          cc: notification.cc,
          subject: "You have a new message on Launch Lane",
          text: `You have a new message on Launch Lane\n\nOpen the conversation: ${threadUrl}`,
        });
      }
      const [sender] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, account.user.id))
        .limit(1);
      res.status(201).json(
        CreateChatMessageResponse.parse(
          messageShape({
            message: result.message,
            senderName: sender?.name ?? account.user.name,
          }),
        ),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not create chat message");
      res.status(500).json({ error: "We couldn't send this message." });
    }
  },
);

router.post(
  "/messages/:threadId/reports",
  ...signedInAccess,
  async (req, res): Promise<void> => {
    const params = ReportChatMessageParams.safeParse(req.params);
    const parsed = ReportChatMessageBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Choose a message to report." });
      return;
    }
    const account = getAccount(res);
    try {
      const access = await getAccessibleThread(params.data.threadId, account);
      if (!access) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      const [message] = await db
        .select({
          message: chatMessagesTable,
          senderName: usersTable.name,
        })
        .from(chatMessagesTable)
        .innerJoin(usersTable, eq(usersTable.id, chatMessagesTable.senderId))
        .where(
          and(
            eq(chatMessagesTable.id, parsed.data.messageId),
            eq(chatMessagesTable.threadId, access.thread.id),
          ),
        )
        .limit(1);
      if (!message) {
        res.status(404).json({ error: "Message not found in this conversation." });
        return;
      }
      const [created] = await db
        .insert(chatMessageReportsTable)
        .values({
          messageId: message.message.id,
          reporterId: account.user.id,
          messageText: message.message.deletedAt
            ? "[Message removed by Launch Lane]"
            : message.message.text,
          reason: parsed.data.reason?.trim() || null,
        })
        .onConflictDoNothing()
        .returning();
      if (created) {
        await sendNotification({
          subject: "A Launch Lane chat message was reported",
          intro: "A conversation participant reported a message for administrator review.",
          rows: [
            ["Thread", access.thread.id],
            ["Sender", `${firstNameForChat(message.senderName)} (${roleLabel(message.message.senderRole)})`],
            ["Reporter", account.identity.firstName || account.user.name],
            ["Reason", parsed.data.reason?.trim() || "No reason provided"],
            ["Review", "Open the /admin page and check reported messages."],
          ],
        });
      }
      res.status(201).json(
        ReportChatMessageResponse.parse({ ok: true }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not report chat message");
      res.status(500).json({ error: "We couldn't send this report." });
    }
  },
);

router.get(
  "/admin/messages/reports",
  ...adminAccess,
  async (req, res): Promise<void> => {
    try {
      const rows = await db
        .select({
          report: chatMessageReportsTable,
          message: chatMessagesTable,
          senderName: usersTable.name,
          locked: chatThreadsTable.locked,
        })
        .from(chatMessageReportsTable)
        .innerJoin(
          chatMessagesTable,
          eq(chatMessagesTable.id, chatMessageReportsTable.messageId),
        )
        .innerJoin(usersTable, eq(usersTable.id, chatMessagesTable.senderId))
        .innerJoin(
          chatThreadsTable,
          eq(chatThreadsTable.id, chatMessagesTable.threadId),
        )
        .where(eq(chatMessageReportsTable.status, "open"))
        .orderBy(desc(chatMessageReportsTable.createdAt));
      const reporters = await Promise.all(
        rows.map(async (row) => {
          const [reporter] = await db
            .select({ name: usersTable.name })
            .from(usersTable)
            .where(eq(usersTable.id, row.report.reporterId))
            .limit(1);
          return {
            id: row.report.id,
            threadId: row.message.threadId,
            messageId: row.message.id,
            messageText: row.report.messageText,
            senderFirstName: firstNameForChat(row.senderName),
            senderRole: row.message.senderRole,
            reporterFirstName: firstNameForChat(reporter?.name ?? "Participant"),
            reason: row.report.reason,
            locked: row.locked,
            createdAt: row.report.createdAt.toISOString(),
          };
        }),
      );
      res.json(GetAdminChatReportsResponse.parse({ reports: reporters }));
    } catch (error) {
      req.log.error({ err: error }, "Could not load administrator chat reports");
      res.status(500).json({ error: "We couldn't load reported messages." });
    }
  },
);

router.delete(
  "/admin/messages/:messageId",
  ...adminAccess,
  async (req, res): Promise<void> => {
    const params = DeleteAdminChatMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(404).json({ error: "Message not found." });
      return;
    }
    const account = getAccount(res);
    try {
      const now = new Date();
      const [message] = await db
        .update(chatMessagesTable)
        .set({
          text: "[Message removed by Launch Lane]",
          deletedAt: now,
          deletedBy: account.user.id,
        })
        .where(eq(chatMessagesTable.id, params.data.messageId))
        .returning();
      if (!message) {
        res.status(404).json({ error: "Message not found." });
        return;
      }
      await db
        .update(chatThreadsTable)
        .set({ updatedAt: now })
        .where(eq(chatThreadsTable.id, message.threadId));
      res.json(DeleteAdminChatMessageResponse.parse({ ok: true }));
    } catch (error) {
      req.log.error({ err: error }, "Could not remove administrator chat message");
      res.status(500).json({ error: "We couldn't remove this message." });
    }
  },
);

router.patch(
  "/admin/messages/threads/:threadId",
  ...adminAccess,
  async (req, res): Promise<void> => {
    const params = SetAdminChatThreadLockParams.safeParse(req.params);
    const parsed = SetAdminChatThreadLockBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Choose whether to lock or unlock this thread." });
      return;
    }
    try {
      const [thread] = await db
        .update(chatThreadsTable)
        .set({ locked: parsed.data.locked, updatedAt: new Date() })
        .where(eq(chatThreadsTable.id, params.data.threadId))
        .returning({ id: chatThreadsTable.id });
      if (!thread) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      res.json(SetAdminChatThreadLockResponse.parse({ ok: true }));
    } catch (error) {
      req.log.error({ err: error }, "Could not change administrator chat thread lock");
      res.status(500).json({ error: "We couldn't update this conversation." });
    }
  },
);

export default router;
