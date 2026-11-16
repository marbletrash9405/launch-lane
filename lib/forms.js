// Which fields each website form sends, used by the API to check and label submissions.
// [key, label, { required, email, max }]

const text = (max = 200) => ({ required: true, max });
const optional = (max = 200) => ({ required: false, max });
const email = { required: true, email: true, max: 200 };

export const forms = {
  "student-application": {
    subject: (d) => `New student application: ${d.business}`,
    intro: "A student applied to list a service on Launch Lane. Review it, then send it to their guardian for approval.",
    replyTo: "email",
    fields: [
      ["business", "Business / listing name", text(120)],
      ["category", "Category", text(60)],
      ["description", "What they offer", text(2000)],
      ["name", "Student name", text(100)],
      ["age", "Age", text(3)],
      ["email", "Student email", email],
      ["address", "Home address", text(200)],
      ["guardianName", "Guardian name", text(100)],
      ["guardianEmail", "Guardian email", email],
      ["agree", "Agreed to guardian approval terms", text(10)],
    ],
  },
  "job-post": {
    subject: (d) => `New job post: ${d.title}`,
    intro: "A resident wants to post a job on Launch Lane. Check their address is in Mercer Crossing before it goes live.",
    replyTo: "email",
    fields: [
      ["title", "Job title", text(120)],
      ["category", "Category", text(60)],
      ["details", "Description", text(2000)],
      ["timing", "Preferred timing", text(200)],
      ["pay", "Offering to pay", text(100)],
      ["name", "Resident name", text(100)],
      ["email", "Resident email", email],
      ["address", "Home address", text(200)],
      ["agree", "Agreed to terms", text(10)],
    ],
  },
  "booking-request": {
    listing: "offering",
    subject: (d, l) => `Booking request: ${l.title}`,
    intro: "A resident wants to book a student's service. Review it before connecting them with the student.",
    replyTo: "email",
    fields: [
      ["name", "Resident name", text(100)],
      ["email", "Resident email", email],
      ["address", "Home address", text(200)],
      ["timing", "When they need it", optional(200)],
      ["message", "Message", text(2000)],
    ],
  },
  "job-application": {
    listing: "job",
    subject: (d, l) => `Job application: ${l.title}`,
    intro: "A student applied for a job a resident posted. Review it and get guardian sign-off before connecting them.",
    replyTo: "email",
    fields: [
      ["name", "Student name", text(100)],
      ["age", "Age", text(3)],
      ["email", "Student email", email],
      ["guardianName", "Guardian name", text(100)],
      ["guardianEmail", "Guardian email", email],
      ["message", "Why they're a good fit", text(2000)],
    ],
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns { values } or { error } */
export function validate(kind, data) {
  const form = forms[kind];
  if (!form) return { error: "Unknown form." };
  const values = {};
  for (const [key, label, rule] of form.fields) {
    const v = typeof data?.[key] === "string" ? data[key].trim() : "";
    if (rule.required && !v) return { error: `${label} is required.` };
    if (v.length > rule.max) return { error: `${label} is too long.` };
    if (v && rule.email && !EMAIL_RE.test(v)) return { error: `${label} doesn't look like an email address.` };
    values[key] = v;
  }
  return { values };
}
