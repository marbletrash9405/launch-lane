import { Router } from "express";
import { forms, validate } from "../lib/forms.js";
import { sendNotification } from "../lib/notify.js";
import { listings } from "../lib/listings.js";
// @ts-ignore - this route preserves the original JavaScript form validation.
import { and, db, eq, businessesTable, usersTable } from "@workspace/db";

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
    if (form.listing === "offering") {
      const [business] = await db
        .select({
          id: businessesTable.id,
          title: businessesTable.name,
          category: businessesTable.category,
          name: usersTable.name,
          email: usersTable.email,
        })
        .from(businessesTable)
        .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
        .where(
          and(
            eq(businessesTable.id, String(listingId)),
            eq(businessesTable.status, "live"),
          ),
        )
        .limit(1);
      listing = business ? { ...business, type: "offering" } : null;
    } else {
      listing = listings.find(
        (item) => item.id === String(listingId) && item.type === form.listing,
      );
    }
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
