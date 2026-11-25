// Server-only Launch Lane email delivery and the persistent testing log.
//
// Set in Replit Secrets:
//   RESEND_API_KEY  optional direct Resend API key
//   RESEND_USE_CONNECTOR=true uses the connected Resend account instead
//   NOTIFY_EMAIL    optional: send submissions somewhere other than site.contactEmail
//                   (comma-separate for more than one inbox)
//   NOTIFY_FROM     optional sender, e.g. "Launch Lane <notifications@launch-laneco.com>" once the
//                   domain is verified in Resend. Until then the default test sender
//                   onboarding@resend.dev works, but only delivers to your Resend account email.

import { randomUUID } from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { desc, db, emailLogsTable, sql } from "@workspace/db";
import { logger } from "./logger";
import { site } from "./site";

const RESEND_URL = process.env.RESEND_API_URL || "https://api.resend.com/emails";
const notifyTo = () => process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL || site.contactEmail;
const connectors = new ReplitConnectors();
const EMAIL_LOG_LIMIT = 500;

export function emailConfigured() {
  return Boolean((process.env.RESEND_API_KEY || process.env.RESEND_USE_CONNECTOR === "true") && notifyTo());
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {{ subject: string, intro: string, rows: [string, string][], replyTo?: string }} msg
 */
async function recordEmail(entry) {
  const logText = entry.text.replace(
    /https?:\/\/[^\s]+\/guardian\/approval\/[A-Za-z0-9_-]+/g,
    "[guardian approval link redacted]",
  );
  try {
    await db.transaction(async (tx) => {
      await tx.insert(emailLogsTable).values({
        id: entry.id,
        createdAt: new Date(entry.createdAt),
        to: entry.to,
        cc: entry.cc,
        subject: entry.subject,
        text: entry.text,
        status: entry.status,
        detail: entry.detail,
      });
      await tx.execute(sql`
        DELETE FROM email_logs
        WHERE id NOT IN (
          SELECT id FROM email_logs
          ORDER BY created_at DESC, id DESC
          LIMIT ${EMAIL_LOG_LIMIT}
        )
      `);
    });
  } catch (error) {
    logger.error({ err: error, emailId: entry.id }, "Could not persist Launch Lane email log entry");
  }
  logger.info(
    {
      emailId: entry.id,
      to: entry.to,
      cc: entry.cc,
      subject: entry.subject,
      text: logText.replace(/[\r\n]+/g, " ").slice(0, 500),
      status: entry.status,
    },
    "Launch Lane email attempt",
  );
}

export async function getEmailLog() {
  const entries = await db
    .select()
    .from(emailLogsTable)
    .orderBy(desc(emailLogsTable.createdAt), desc(emailLogsTable.id))
    .limit(EMAIL_LOG_LIMIT);
  return entries.map((entry) => ({
    ...entry,
    createdAt: entry.createdAt.toISOString(),
  }));
}

export async function sendEmail({
  to,
  cc = [],
  subject,
  text,
  html,
  replyTo,
}) {
  const entry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    to: [...to],
    cc: [...cc],
    subject,
    text,
    status: "logged",
    detail: null,
  };

  if ([...entry.to, ...entry.cc].some((email) => /\.invalid$/i.test(email))) {
    entry.detail = "Synthetic test recipient; logged only to avoid sending to a nonexistent inbox.";
    await recordEmail(entry);
    return { status: entry.status, id: entry.id };
  }

  if (!process.env.RESEND_API_KEY && process.env.RESEND_USE_CONNECTOR !== "true") {
    entry.detail = "Resend is not configured; this email was logged but not sent.";
    await recordEmail(entry);
    return { status: entry.status, id: entry.id };
  }

  try {
    const payload = {
        from: process.env.NOTIFY_FROM || "Launch Lane <onboarding@resend.dev>",
        to: entry.to,
        ...(entry.cc.length ? { cc: entry.cc } : {}),
        subject,
        text,
        ...(html ? { html } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      };
    const response = process.env.RESEND_API_KEY
      ? await fetch(RESEND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": entry.id,
          },
          body: JSON.stringify(payload),
        })
      : await connectors.proxy("resend", "/emails", {
          method: "POST",
          headers: { "Idempotency-Key": entry.id },
          body: payload,
        });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      entry.status = "failed";
      entry.detail = `Resend returned HTTP ${response.status}${typeof result.message === "string" ? `: ${result.message.slice(0, 300)}` : "."}`;
    } else {
      entry.status = "sent";
      entry.detail = `Accepted by Resend${result.id ? ` (${result.id})` : ""}.`;
    }
  } catch {
    entry.status = "failed";
    entry.detail = "The email service could not be reached.";
  }

  await recordEmail(entry);
  return { status: entry.status, id: entry.id };
}

export async function sendNotification({ subject, intro, rows, replyTo }) {
  const text = [intro, "", ...rows.map(([key, value]) => `${key}: ${value}`)].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#2b2620;max-width:640px">
      <p style="font-size:15px">${escapeHtml(intro)}</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${rows
          .map(
            ([key, value]) => `<tr>
              <td style="padding:8px 12px;border:1px solid #e4dccb;background:#faf5e9;width:34%;vertical-align:top"><b>${escapeHtml(key)}</b></td>
              <td style="padding:8px 12px;border:1px solid #e4dccb;white-space:pre-wrap">${escapeHtml(value)}</td>
            </tr>`,
          )
          .join("")}
      </table>
      <p style="font-size:12px;color:#5e564c;margin-top:16px">Sent from the Launch Lane website. Reply to this email to reach the person who submitted it.</p>
    </div>`;

  return sendEmail({
    to: notifyTo().split(",").map((item) => item.trim()).filter(Boolean),
    subject,
    text,
    html,
    replyTo,
  });
}
