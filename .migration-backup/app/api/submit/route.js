import { forms, validate } from "@/lib/forms";
import { emailConfigured, sendNotification } from "@/lib/notify";
import { listings } from "@/data/listings";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { kind, data = {}, listingId } = body || {};

  // Hidden "website" field: real people never fill it in, spam bots usually do.
  if (data.website) return Response.json({ ok: true });

  const form = forms[kind];
  if (!form) return Response.json({ error: "Unknown form." }, { status: 400 });

  let listing = null;
  if (form.listing) {
    listing = listings.find((l) => l.id === String(listingId) && l.type === form.listing);
    if (!listing) return Response.json({ error: "That listing is no longer available." }, { status: 400 });
  }

  const { values, error } = validate(kind, data);
  if (error) return Response.json({ error }, { status: 400 });

  if (!emailConfigured()) {
    return Response.json(
      { error: "not_configured", message: "Submissions aren't switched on yet." },
      { status: 503 }
    );
  }

  const labelled = form.fields.map(([key, label]) => [label, values[key] || "—"]);
  const listingRows = listing
    ? [
        ["Listing", `${listing.title} (${listing.category})`],
        [listing.type === "offering" ? "Student" : "Posted by", `${listing.name} <${listing.email}>`],
      ]
    : [];

  try {
    await sendNotification({
      subject: form.subject(values, listing),
      intro: form.intro,
      rows: [...listingRows, ...labelled],
      replyTo: values[form.replyTo],
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "We couldn't send that just now. Please try again." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
