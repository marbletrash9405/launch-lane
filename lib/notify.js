// Server-only: sends Launch Lane submissions to the team's inbox through Resend (resend.com).
//
// Set in Vercel → Project → Settings → Environment Variables:
//   RESEND_API_KEY  your Resend API key (required)
//   NOTIFY_EMAIL    optional: send submissions somewhere other than site.contactEmail
//                   (comma-separate for more than one inbox)
//   NOTIFY_FROM     optional sender, e.g. "Launch Lane <notifications@launch-laneco.com>" once the
//                   domain is verified in Resend. Until then the default test sender
//                   onboarding@resend.dev works, but only delivers to your Resend account email.

import { site } from "./site";

const RESEND_URL = process.env.RESEND_API_URL || "https://api.resend.com/emails";
const notifyTo = () => process.env.NOTIFY_EMAIL || site.contactEmail;

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && notifyTo());
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
export async function sendNotification({ subject, intro, rows, replyTo }) {
  const text = [intro, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#2b2620;max-width:640px">
      <p style="font-size:15px">${escapeHtml(intro)}</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${rows
          .map(
            ([k, v]) => `<tr>
              <td style="padding:8px 12px;border:1px solid #e4dccb;background:#faf5e9;width:34%;vertical-align:top"><b>${escapeHtml(k)}</b></td>
              <td style="padding:8px 12px;border:1px solid #e4dccb;white-space:pre-wrap">${escapeHtml(v)}</td>
            </tr>`
          )
          .join("")}
      </table>
      <p style="font-size:12px;color:#5e564c;margin-top:16px">Sent from the Launch Lane website. Reply to this email to reach the person who submitted it.</p>
    </div>`;

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM || "Launch Lane <onboarding@resend.dev>",
      to: notifyTo().split(",").map((s) => s.trim()).filter(Boolean),
      subject,
      text,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${body.slice(0, 300)}`);
  }
}
