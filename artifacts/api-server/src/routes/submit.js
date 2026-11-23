import { Router } from "express";
import { forms, validate } from "../lib/forms.js";
import { emailConfigured, sendNotification } from "../lib/notify.js";
import { listings } from "../lib/listings.js";

const router = Router();

router.post("/submit", async (req, res) => {
  const body = req.body || {};
  const { kind, data = {}, listingId } = body;

  // Hidden "website" field: real people never fill it in, spam bots usually do.
  if (data.website) {
    res.json({ ok: true });
    return;
  }

  if (typeof kind !== "string" || !Object.hasOwn(forms, kind)) {
    res.status(400).json({ error: "Unknown form." });
    return;
  }

  const form = forms[kind];
  let listing = null;
  if (form.listing) {
    listing = listings.find(
      (item) => item.id === String(listingId) && item.type === form.listing,
    );
    if (!listing) {
      res.status(400).json({ error: "That listing is no longer available." });
      return;
    }
  }

  const { values, error } = validate(kind, data);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  if (!emailConfigured()) {
    res.status(503).json({
      error: "not_configured",
      message: "Submissions aren't switched on yet.",
    });
    return;
  }

  const labelled = form.fields.map(([key, label]) => [label, values[key] || "—"]);
  const listingRows = listing
    ? [
        ["Listing", `${listing.title} (${listing.category})`],
        [
          listing.type === "offering" ? "Student" : "Posted by",
          `${listing.name} <${listing.email}>`,
        ],
      ]
    : [];

  try {
    await sendNotification({
      subject: form.subject(values, listing),
      intro: form.intro,
      rows: [...listingRows, ...labelled],
      replyTo: values[form.replyTo],
    });
    res.json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Could not send Launch Lane submission");
    res.status(502).json({
      error: "We couldn't send that just now. Please try again.",
    });
  }
});

export default router;
