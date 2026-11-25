import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import sharp from "sharp";
import {
  CreateBusinessResponse,
  CreateBusinessBody,
  GetAdminBusinessesResponse,
  GetAdminEmailLogResponse,
  GetMyBusinessesResponse,
  GetPublicBusinessesResponse,
  ReviewBusinessBody,
  ReviewBusinessResponse,
  SetAdminBusinessPauseResponse,
  SetAdminBusinessPauseBody,
  SetBusinessPauseResponse,
  SetBusinessPauseBody,
  UpdateBusinessResponse,
  UpdateBusinessBody,
  UpdateBusinessParams,
} from "@workspace/api-zod";
import {
  and,
  db,
  desc,
  eq,
  guardianApprovalsTable,
  businessesTable,
  isNull,
  studentProfilesTable,
  usersTable,
} from "@workspace/db";
import {
  getAccount,
  requireAccount,
  requireRole,
  requireSignedIn,
} from "../lib/authorization";
import { ObjectStorageService } from "../lib/objectStorage";
import { getPublicOrigin as buildPublicOrigin } from "../lib/public-origin";
// @ts-ignore - this module preserves the original JavaScript email delivery helper.
import { getEmailLog, sendEmail, sendNotification } from "../lib/notify.js";

const router = Router();
const objectStorage = new ObjectStorageService();
const studentAccess = [requireSignedIn, requireAccount, requireRole("student")];
const adminAccess = [requireSignedIn, requireAccount, requireRole("admin")];
const MAX_IMAGE_BYTES = 215040;

function toPhotoUrl(objectPath: string) {
  return `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
}

function toStudentBusiness(business: typeof businessesTable.$inferSelect, ownerName: string) {
  return {
    id: business.id,
    name: business.name,
    category: business.category,
    description: business.description,
    pricingText: business.pricingText,
    studentName: ownerName.split(/\s+/)[0] || "Student",
    photoPaths: business.photoPaths,
    photoUrls: business.photoPaths.map(toPhotoUrl),
    status: business.status,
    rejectionReason: business.rejectionReason,
    pausedBy: business.pausedBy,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}

function toAdminBusiness(row: {
  business: typeof businessesTable.$inferSelect;
  ownerName: string;
  ownerEmail: string;
  age: number;
  privateAddress: string;
  guardianName: string;
  guardianEmail: string;
}) {
  return {
    ...toStudentBusiness(row.business, row.ownerName),
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    age: row.age,
    privateAddress: row.privateAddress,
    guardianName: row.guardianName,
    guardianEmail: row.guardianEmail,
  };
}

async function getAdminBusiness(businessId: string) {
  const [row] = await db
    .select({
      business: businessesTable,
      ownerName: usersTable.name,
      ownerEmail: usersTable.email,
      age: studentProfilesTable.age,
      privateAddress: studentProfilesTable.homeAddress,
      guardianName: studentProfilesTable.guardianName,
      guardianEmail: studentProfilesTable.guardianEmail,
    })
    .from(businessesTable)
    .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
    .innerJoin(studentProfilesTable, eq(studentProfilesTable.userId, businessesTable.ownerId))
    .where(eq(businessesTable.id, businessId))
    .limit(1);
  return row ? toAdminBusiness(row) : null;
}

async function validatePhotoPaths(paths: string[], ownerId: string) {
  if (paths.length > 3) return false;
  const ownUploadPrefix = `/objects/uploads/${ownerId}/`;
  for (const path of paths) {
    if (
      typeof path !== "string" ||
      !path.startsWith(ownUploadPrefix) ||
      !/^\/objects\/uploads\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i.test(path)
    ) {
      return false;
    }
    try {
      const file = await objectStorage.getObjectEntityFile(path);
      const [metadata] = await file.getMetadata();
      if (
        metadata.contentType !== "image/webp" ||
        Number(metadata.size || 0) > MAX_IMAGE_BYTES
      ) {
        return false;
      }
      const [imageBytes] = await file.download();
      const imageInfo = await sharp(imageBytes, {
        limitInputPixels: 40_000_000,
      }).metadata();
      if (
        imageInfo.format !== "webp" ||
        !imageInfo.width ||
        imageInfo.width > 1600
      ) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

async function setPrivatePhotoOwners(paths: string[], ownerId: string) {
  await Promise.all(
    paths.map((path) =>
      objectStorage.trySetObjectEntityAclPolicy(path, {
        owner: ownerId,
        visibility: "private",
      }),
    ),
  );
}

async function emailAdminAboutBusiness(
  business: typeof businessesTable.$inferSelect,
  ownerName: string,
  ownerEmail: string,
  profile: {
    age: number;
    homeAddress: string;
    guardianName: string;
    guardianEmail: string;
  },
) {
  await sendNotification({
    subject: `Business review needed: ${business.name}`,
    intro: "A student business is ready for administrator review.",
    replyTo: ownerEmail,
    rows: [
      ["Student", `${ownerName} (${ownerEmail}), age ${profile.age}`],
      ["Business", business.name],
      ["Category", business.category],
      ["Description", business.description],
      ["Pricing", business.pricingText],
      ["Home address (private)", profile.homeAddress],
      ["Guardian", `${profile.guardianName} <${profile.guardianEmail}>`],
    ],
  });
}

router.get("/businesses/public", async (req, res) => {
  try {
    const rows = await db
      .select({
        business: businessesTable,
        ownerName: usersTable.name,
      })
      .from(businessesTable)
      .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
      .where(eq(businessesTable.status, "live"))
      .orderBy(desc(businessesTable.createdAt));
    res.json(
      GetPublicBusinessesResponse.parse({
        businesses: rows.map(({ business, ownerName }) => {
        const student = toStudentBusiness(business, ownerName);
        return {
          id: student.id,
          name: student.name,
          category: student.category,
          description: student.description,
          pricingText: student.pricingText,
          studentName: student.studentName,
          photoUrls: student.photoUrls,
        };
        }),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Could not load public Launch Lane businesses");
    res.status(500).json({ error: "We couldn't load listings. Please try again." });
  }
});

router.get("/businesses/mine", ...studentAccess, async (req, res) => {
  const account = getAccount(res);
  try {
    const rows = await db
      .select({ business: businessesTable, ownerName: usersTable.name })
      .from(businessesTable)
      .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
      .where(eq(businessesTable.ownerId, account.user.id))
      .orderBy(desc(businessesTable.createdAt));
    res.json(
      GetMyBusinessesResponse.parse({
        businesses: rows.map(({ business, ownerName }) =>
          toStudentBusiness(business, ownerName),
        ),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Could not load student businesses");
    res.status(500).json({ error: "We couldn't load your businesses. Please try again." });
  }
});

router.post("/businesses", ...studentAccess, async (req, res) => {
  const account = getAccount(res);
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check the business name, category, description, pricing, and photos." });
    return;
  }

  try {
    const [profile] = await db
      .select()
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.userId, account.user.id))
      .limit(1);
    if (!profile) {
      res.status(403).json({ error: "Complete your student profile before creating a business." });
      return;
    }
    if (!(await validatePhotoPaths(parsed.data.photoPaths, account.user.id))) {
      res.status(400).json({ error: "Photos must be your own resized WebP uploads and no larger than 210 KB each." });
      return;
    }
    await setPrivatePhotoOwners(parsed.data.photoPaths, account.user.id);
    const [business] = await db
      .insert(businessesTable)
      .values({
        ownerId: account.user.id,
        ...parsed.data,
        status: "pending_review",
      })
      .returning();
    const result = toStudentBusiness(business, account.user.name);
    await emailAdminAboutBusiness(business, account.user.name, account.user.email, profile);
    res.status(201).json(CreateBusinessResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Could not create Launch Lane business");
    res.status(500).json({ error: "We couldn't save your business. Please try again." });
  }
});

router.patch("/businesses/:businessId", ...studentAccess, async (req, res) => {
  const account = getAccount(res);
  const params = UpdateBusinessParams.safeParse(req.params);
  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Enter at least one valid business update." });
    return;
  }

  try {
    const [business] = await db
      .select()
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, params.data.businessId),
          eq(businessesTable.ownerId, account.user.id),
        ),
      )
      .limit(1);
    if (!business) {
      res.status(404).json({ error: "Business not found." });
      return;
    }
    const nextPhotos = parsed.data.photoPaths ?? business.photoPaths;
    if (!(await validatePhotoPaths(nextPhotos, account.user.id))) {
      res.status(400).json({ error: "Photos must be your own resized WebP uploads and no larger than 210 KB each." });
      return;
    }
    await setPrivatePhotoOwners(nextPhotos, account.user.id);

    const nameOrCategoryChanged =
      (parsed.data.name !== undefined && parsed.data.name !== business.name) ||
      (parsed.data.category !== undefined && parsed.data.category !== business.category);
    const editableContentChanged =
      (parsed.data.description !== undefined && parsed.data.description !== business.description) ||
      (parsed.data.pricingText !== undefined && parsed.data.pricingText !== business.pricingText) ||
      (parsed.data.photoPaths !== undefined &&
        JSON.stringify(parsed.data.photoPaths) !== JSON.stringify(business.photoPaths));
    let status = business.status;
    let pausedBy = business.pausedBy;
    let rejectionReason = business.rejectionReason;
    const revokeGuardianApproval =
      nameOrCategoryChanged ||
      (business.status === "pending_guardian" && editableContentChanged);
    if (nameOrCategoryChanged || business.status === "rejected" || revokeGuardianApproval) {
      status = "pending_review";
      pausedBy = null;
      rejectionReason = null;
    }

    const updated = await db.transaction(async (tx) => {
      if (revokeGuardianApproval) {
        await tx
          .update(guardianApprovalsTable)
          .set({ consumedAt: new Date() })
          .where(
            and(
              eq(guardianApprovalsTable.targetType, "business"),
              eq(guardianApprovalsTable.targetId, business.id),
              isNull(guardianApprovalsTable.consumedAt),
            ),
          );
      }
      const [row] = await tx
        .update(businessesTable)
        .set({
          ...parsed.data,
          photoPaths: nextPhotos,
          status,
          pausedBy,
          rejectionReason,
          updatedAt: new Date(),
        })
        .where(eq(businessesTable.id, business.id))
        .returning();
      return row;
    });
    if (status === "pending_review" && business.status !== "pending_review") {
      const [profile] = await db
        .select()
        .from(studentProfilesTable)
        .where(eq(studentProfilesTable.userId, account.user.id))
        .limit(1);
      if (profile) {
        await emailAdminAboutBusiness(updated, account.user.name, account.user.email, profile);
      }
    }
    res.json(UpdateBusinessResponse.parse(toStudentBusiness(updated, account.user.name)));
  } catch (error) {
    req.log.error({ err: error }, "Could not update student business");
    res.status(500).json({ error: "We couldn't update your business. Please try again." });
  }
});

router.post("/businesses/:businessId/pause", ...studentAccess, async (req, res) => {
  const account = getAccount(res);
  const params = UpdateBusinessParams.safeParse(req.params);
  const parsed = SetBusinessPauseBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid pause request." });
    return;
  }
  try {
    const [business] = await db
      .select()
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, params.data.businessId),
          eq(businessesTable.ownerId, account.user.id),
        ),
      )
      .limit(1);
    if (!business) {
      res.status(404).json({ error: "Business not found." });
      return;
    }
    if (
      (parsed.data.paused && business.status !== "live") ||
      (!parsed.data.paused &&
        (business.status !== "paused" || business.pausedBy !== "student"))
    ) {
      res.status(409).json({ error: "Only a live business can be paused, and only a student-paused business can be resumed here." });
      return;
    }
    const [updated] = await db
      .update(businessesTable)
      .set({
        status: parsed.data.paused ? "paused" : "live",
        pausedBy: parsed.data.paused ? "student" : null,
        updatedAt: new Date(),
      })
      .where(eq(businessesTable.id, business.id))
      .returning();
    res.json(SetBusinessPauseResponse.parse(toStudentBusiness(updated, account.user.name)));
  } catch (error) {
    req.log.error({ err: error }, "Could not change student business visibility");
    res.status(500).json({ error: "We couldn't change your business status. Please try again." });
  }
});

router.get("/admin/businesses", ...adminAccess, async (req, res) => {
  try {
    const rows = await db
      .select({
        business: businessesTable,
        ownerName: usersTable.name,
        ownerEmail: usersTable.email,
        age: studentProfilesTable.age,
        privateAddress: studentProfilesTable.homeAddress,
        guardianName: studentProfilesTable.guardianName,
        guardianEmail: studentProfilesTable.guardianEmail,
      })
      .from(businessesTable)
      .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
      .innerJoin(studentProfilesTable, eq(studentProfilesTable.userId, businessesTable.ownerId))
      .orderBy(desc(businessesTable.createdAt));
    res.json(GetAdminBusinessesResponse.parse({ businesses: rows.map(toAdminBusiness) }));
  } catch (error) {
    req.log.error({ err: error }, "Could not load admin business queue");
    res.status(500).json({ error: "We couldn't load the business review queue." });
  }
});

router.post("/admin/businesses/:businessId/review", ...adminAccess, async (req, res) => {
  const params = UpdateBusinessParams.safeParse(req.params);
  const parsed = ReviewBusinessBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid business review request." });
    return;
  }
  const reason = parsed.data.reason?.trim() || "";
  if (parsed.data.action === "reject" && !reason) {
    res.status(400).json({ error: "Add a reason when rejecting a business." });
    return;
  }

  try {
    const current = await getAdminBusiness(params.data.businessId);
    if (!current) {
      res.status(404).json({ error: "Business not found." });
      return;
    }
    if (current.status !== "pending_review") {
      res.status(409).json({ error: "This business is no longer waiting for review." });
      return;
    }

    if (parsed.data.action === "reject") {
      const [updated] = await db
        .update(businessesTable)
        .set({
          status: "rejected",
          rejectionReason: reason,
          pausedBy: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(businessesTable.id, current.id),
            eq(businessesTable.status, "pending_review"),
          ),
        )
        .returning();
      if (!updated) {
        res.status(409).json({ error: "This business is no longer waiting for review." });
        return;
      }
      await sendEmail({
        to: [current.ownerEmail],
        cc: [current.guardianEmail],
        subject: `Launch Lane business update: ${current.name}`,
        text: `Your business was not approved yet.\n\nReason: ${reason}\n\nPlease update it in your Launch Lane dashboard and submit it for review again.`,
      });
      res.json(ReviewBusinessResponse.parse(await getAdminBusiness(updated.id)));
      return;
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const approvalUrl = `${buildPublicOrigin({
      publicAppUrl: process.env.PUBLIC_APP_URL,
      forwardedHost: req.get("x-forwarded-host"),
      host: req.get("host"),
      forwardedProtocol: req.get("x-forwarded-proto"),
    })}/guardian/approval/${token}`;
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(businessesTable)
        .set({
          status: "pending_guardian",
          rejectionReason: null,
          pausedBy: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(businessesTable.id, current.id),
            eq(businessesTable.status, "pending_review"),
          ),
        )
        .returning();
      if (!row) return null;
      await tx.insert(guardianApprovalsTable).values({
        targetType: "business",
        targetId: row.id,
        tokenHash,
        expiresAt,
      });
      return row;
    });
    if (!updated) {
      res.status(409).json({ error: "This business is no longer waiting for review." });
      return;
    }

    await sendEmail({
      to: [current.guardianEmail],
      subject: `Please review ${current.name} on Launch Lane`,
      text: `Hello ${current.guardianName},\n\n${current.ownerName} has submitted ${current.name} (${current.category}) for a student business listing on Launch Lane. The administrator reviewed it. Please approve or decline the listing here:\n\n${approvalUrl}\n\nThis one-time link expires in seven days.`,
    });
    res.json(ReviewBusinessResponse.parse(await getAdminBusiness(updated.id)));
  } catch (error) {
    req.log.error({ err: error }, "Could not review student business");
    res.status(500).json({ error: "We couldn't complete the review. Please try again." });
  }
});

router.post("/admin/businesses/:businessId/pause", ...adminAccess, async (req, res) => {
  const params = UpdateBusinessParams.safeParse(req.params);
  const parsed = SetAdminBusinessPauseBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid business pause request." });
    return;
  }
  try {
    const [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, params.data.businessId))
      .limit(1);
    if (!business) {
      res.status(404).json({ error: "Business not found." });
      return;
    }
    if (
      (parsed.data.paused && business.status !== "live" && business.status !== "paused") ||
      (!parsed.data.paused && business.status !== "paused")
    ) {
      res.status(409).json({ error: "Only a live or paused business can be managed here." });
      return;
    }
    await db
      .update(businessesTable)
      .set({
        status: parsed.data.paused ? "paused" : "live",
        pausedBy: parsed.data.paused ? "admin" : null,
        updatedAt: new Date(),
      })
      .where(eq(businessesTable.id, business.id));
    res.json(
      SetAdminBusinessPauseResponse.parse(await getAdminBusiness(business.id)),
    );
  } catch (error) {
    req.log.error({ err: error }, "Could not change administrator business visibility");
    res.status(500).json({ error: "We couldn't change this business status." });
  }
});

router.get("/admin/email-log", ...adminAccess, (_req, res) => {
  res.json(
    GetAdminEmailLogResponse.parse({
      emails: getEmailLog(),
      notice: "This in-memory testing log clears when the API server restarts.",
    }),
  );
});

export default router;
