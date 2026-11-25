import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  and,
  bookingsTable,
  businessesTable,
  db,
  desc,
  eq,
  residentProfilesTable,
  studentProfilesTable,
  usersTable,
} from "@workspace/db";
import {
  CancelBookingParams,
  CancelBookingResponse,
  CreateBookingBody,
  CreateBookingResponse,
  GetIncomingBookingsResponse,
  GetMyBookingsResponse,
  UpdateBookingStatusBody,
  UpdateBookingStatusParams,
  UpdateBookingStatusResponse,
} from "@workspace/api-zod";
import {
  getAccount,
  requireAccount,
  requireRole,
  requireSignedIn,
} from "../lib/authorization";
import { deriveResidentStreetName } from "../lib/resident-street";
import { createChatThread } from "../lib/chat-threads";
// @ts-ignore - the shared mail helper is maintained in JavaScript.
import { sendEmail } from "../lib/notify.js";

const router = Router();
const residentAccess = [requireSignedIn, requireAccount, requireRole("resident")];
const studentAccess = [requireSignedIn, requireAccount, requireRole("student")];
const bookingCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Please wait before sending another booking request." });
  },
});

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Neighbor";
}

function studentBookingResponse(
  booking: typeof bookingsTable.$inferSelect,
  businessName: string,
  residentName: string,
  residentStreetName: string | null,
  residentAddress: string,
) {
  return {
    id: booking.id,
    businessId: booking.businessId,
    businessName,
    residentFirstName: firstName(residentName),
    residentStreetName:
      residentStreetName ?? deriveResidentStreetName(residentAddress),
    message: booking.message,
    preferredTiming: booking.preferredTiming,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

function residentBookingResponse(
  booking: typeof bookingsTable.$inferSelect,
  businessName: string,
  category: string,
  studentName: string,
) {
  return {
    id: booking.id,
    businessId: booking.businessId,
    businessName,
    category,
    studentFirstName: firstName(studentName),
    message: booking.message,
    preferredTiming: booking.preferredTiming,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

router.get("/bookings/incoming", ...studentAccess, async (req, res): Promise<void> => {
  const account = getAccount(res);
  try {
    const rows = await db
      .select({
        booking: bookingsTable,
        businessName: businessesTable.name,
        residentName: usersTable.name,
        streetName: residentProfilesTable.streetName,
        homeAddress: residentProfilesTable.homeAddress,
      })
      .from(bookingsTable)
      .innerJoin(businessesTable, eq(businessesTable.id, bookingsTable.businessId))
      .innerJoin(usersTable, eq(usersTable.id, bookingsTable.residentId))
      .innerJoin(
        residentProfilesTable,
        eq(residentProfilesTable.userId, bookingsTable.residentId),
      )
      .where(eq(businessesTable.ownerId, account.user.id))
      .orderBy(desc(bookingsTable.createdAt));
    res.json(
      GetIncomingBookingsResponse.parse({
        bookings: rows.map((row) =>
          studentBookingResponse(
            row.booking,
            row.businessName,
            row.residentName,
            row.streetName,
            row.homeAddress,
          ),
        ),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Could not load student booking requests");
    res.status(500).json({ error: "We couldn't load your booking requests." });
  }
});

router.get("/bookings/mine", ...residentAccess, async (req, res): Promise<void> => {
  const account = getAccount(res);
  try {
    const rows = await db
      .select({
        booking: bookingsTable,
        businessName: businessesTable.name,
        category: businessesTable.category,
        studentName: usersTable.name,
      })
      .from(bookingsTable)
      .innerJoin(businessesTable, eq(businessesTable.id, bookingsTable.businessId))
      .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
      .where(eq(bookingsTable.residentId, account.user.id))
      .orderBy(desc(bookingsTable.createdAt));
    res.json(
      GetMyBookingsResponse.parse({
        bookings: rows.map((row) =>
          residentBookingResponse(
            row.booking,
            row.businessName,
            row.category,
            row.studentName,
          ),
        ),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Could not load resident bookings");
    res.status(500).json({ error: "We couldn't load your bookings." });
  }
});

router.post(
  "/bookings",
  bookingCreationLimiter,
  ...residentAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    const parsed = CreateBookingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Add a message and check your booking details." });
      return;
    }

    try {
      const [residentProfile] = await db
        .select()
        .from(residentProfilesTable)
        .where(eq(residentProfilesTable.userId, account.user.id))
        .limit(1);
      if (!residentProfile) {
        res.status(403).json({ error: "Complete your resident profile before booking." });
        return;
      }

      const result = await db.transaction(async (tx) => {
        const [context] = await tx
          .select({
            business: businessesTable,
            student: usersTable,
            guardianEmail: studentProfilesTable.guardianEmail,
          })
          .from(businessesTable)
          .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
          .innerJoin(
            studentProfilesTable,
            eq(studentProfilesTable.userId, businessesTable.ownerId),
          )
          .where(eq(businessesTable.id, parsed.data.businessId))
          .for("update")
          .limit(1);
        if (!context || context.business.status !== "live") return null;

        const [booking] = await tx
          .insert(bookingsTable)
          .values({
            businessId: context.business.id,
            residentId: account.user.id,
            message: parsed.data.message.trim(),
            preferredTiming: parsed.data.preferredTiming?.trim() ?? "",
            status: "requested",
          })
          .returning();
        return { booking, ...context };
      });

      if (!result) {
        res.status(404).json({ error: "This business is not available for booking." });
        return;
      }

      const residentFirstName = firstName(account.user.name);
      const residentStreetName =
        residentProfile.streetName ??
        deriveResidentStreetName(residentProfile.homeAddress);
      await sendEmail({
        to: [result.student.email],
        cc: [result.guardianEmail],
        subject: `New booking request: ${result.business.name}`,
        text: [
          `A neighbor sent a booking request for ${result.business.name}.`,
          "",
          `Resident: ${residentFirstName}`,
          `Street: ${residentStreetName ?? "Not available"}`,
          `Preferred timing: ${result.booking.preferredTiming || "Not provided"}`,
          `Message: ${result.booking.message}`,
          "",
          "Open your Launch Lane dashboard to accept or decline. Contact details are shared only after you accept.",
        ].join("\n"),
      });

      res.status(201).json(
        CreateBookingResponse.parse({
          id: result.booking.id,
          businessId: result.booking.businessId,
          businessName: result.business.name,
          status: result.booking.status,
          createdAt: result.booking.createdAt.toISOString(),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not create booking request");
      res.status(500).json({ error: "We couldn't send your booking request." });
    }
  },
);

router.patch(
  "/bookings/:bookingId/status",
  ...studentAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    const params = UpdateBookingStatusParams.safeParse(req.params);
    const parsed = UpdateBookingStatusBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Choose a valid booking action." });
      return;
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [booking] = await tx
          .select()
          .from(bookingsTable)
          .where(eq(bookingsTable.id, params.data.bookingId))
          .for("update")
          .limit(1);
        if (!booking) return { kind: "not_found" as const };

        const [business] = await tx
          .select()
          .from(businessesTable)
          .where(
            and(
              eq(businessesTable.id, booking.businessId),
              eq(businessesTable.ownerId, account.user.id),
            ),
          )
          .limit(1);
        if (!business) return { kind: "not_found" as const };

        const action = parsed.data.action;
        const nextStatus =
          action === "accept"
            ? "accepted"
            : action === "decline"
              ? "declined"
              : "completed";
        const allowed =
          (booking.status === "requested" &&
            (action === "accept" || action === "decline")) ||
          (booking.status === "accepted" && action === "complete");
        if (!allowed) return { kind: "conflict" as const };

        const [updated] = await tx
          .update(bookingsTable)
          .set({ status: nextStatus, updatedAt: new Date() })
          .where(eq(bookingsTable.id, booking.id))
          .returning();
        const [resident] = await tx
          .select({
            name: usersTable.name,
            email: usersTable.email,
            streetName: residentProfilesTable.streetName,
            homeAddress: residentProfilesTable.homeAddress,
          })
          .from(usersTable)
          .innerJoin(
            residentProfilesTable,
            eq(residentProfilesTable.userId, usersTable.id),
          )
          .where(eq(usersTable.id, booking.residentId))
          .limit(1);
        const [studentProfile] = await tx
          .select()
          .from(studentProfilesTable)
          .where(eq(studentProfilesTable.userId, account.user.id))
          .limit(1);
        if (!resident || !studentProfile) {
          throw new Error("The booking participant profile is unavailable.");
        }
        if (action === "accept") {
          await createChatThread(tx, {
            bookingId: booking.id,
            studentId: business.ownerId,
            studentEmail: account.user.email,
            residentId: booking.residentId,
            residentEmail: resident.email,
            guardianEmail: studentProfile.guardianEmail,
          });
        }

        return {
          kind: "updated" as const,
          booking: updated,
          businessName: business.name,
          resident,
          studentProfile,
        };
      });

      if (result.kind === "not_found") {
        res.status(404).json({ error: "Booking not found." });
        return;
      }
      if (result.kind === "conflict") {
        res.status(409).json({ error: "This booking cannot move to that status." });
        return;
      }

      if (parsed.data.action === "accept") {
        const residentFirstName = firstName(result.resident.name);
        const residentStreetName =
          result.resident.streetName ??
          deriveResidentStreetName(result.resident.homeAddress);
        await sendEmail({
          to: [result.resident.email],
          subject: `Booking accepted: ${result.businessName}`,
          text: [
            `Your booking request for ${result.businessName} was accepted by ${account.user.name}.`,
            "",
            `Student email: ${account.user.email}`,
            "You can reply to this email to arrange the details directly.",
            "Launch Lane does not collect payment; agree on the price and payment directly.",
          ].join("\n"),
        });
        await sendEmail({
          to: [account.user.email],
          cc: [result.studentProfile.guardianEmail],
          subject: `Booking accepted: ${result.businessName}`,
          text: [
            `You accepted ${residentFirstName}'s request for ${result.businessName}.`,
            "",
            `Resident email: ${result.resident.email}`,
            `Street: ${residentStreetName ?? "Not available"}`,
            `Preferred timing: ${result.booking.preferredTiming || "Not provided"}`,
            `Message: ${result.booking.message}`,
            "",
            "You can reply to the resident to arrange the details directly. Launch Lane does not collect payment.",
          ].join("\n"),
        });
      } else if (parsed.data.action === "decline") {
        await sendEmail({
          to: [result.resident.email],
          subject: `Booking update: ${result.businessName}`,
          text: `Your booking request for ${result.businessName} was declined. You can browse other local services on Launch Lane.`,
        });
      }

      res.json(
        UpdateBookingStatusResponse.parse(
          studentBookingResponse(
            result.booking,
            result.businessName,
            result.resident.name,
            result.resident.streetName,
            result.resident.homeAddress,
          ),
        ),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not update booking status");
      res.status(500).json({ error: "We couldn't update this booking." });
    }
  },
);

router.post(
  "/bookings/:bookingId/cancel",
  ...residentAccess,
  async (req, res): Promise<void> => {
    const account = getAccount(res);
    const params = CancelBookingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid booking." });
      return;
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [booking] = await tx
          .select()
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.id, params.data.bookingId),
              eq(bookingsTable.residentId, account.user.id),
            ),
          )
          .for("update")
          .limit(1);
        if (!booking) return { kind: "not_found" as const };
        if (booking.status === "completed" || booking.status === "cancelled") {
          return { kind: "conflict" as const };
        }

        const [updated] = await tx
          .update(bookingsTable)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(bookingsTable.id, booking.id))
          .returning();
        const [business] = await tx
          .select({
            name: businessesTable.name,
            category: businessesTable.category,
          })
          .from(businessesTable)
          .where(eq(businessesTable.id, booking.businessId))
          .limit(1);
        const [student] = await tx
          .select({
            name: usersTable.name,
            email: usersTable.email,
            guardianEmail: studentProfilesTable.guardianEmail,
          })
          .from(usersTable)
          .innerJoin(
            businessesTable,
            eq(businessesTable.ownerId, usersTable.id),
          )
          .innerJoin(
            studentProfilesTable,
            eq(studentProfilesTable.userId, usersTable.id),
          )
          .where(eq(businessesTable.id, booking.businessId))
          .limit(1);
        if (!business || !student) {
          throw new Error("The booking business could not be found.");
        }
        return {
          kind: "cancelled" as const,
          booking: updated,
          business,
          studentName: student.name,
          studentEmail: student.email,
          guardianEmail: student.guardianEmail,
        };
      });

      if (result.kind === "not_found") {
        res.status(404).json({ error: "Booking not found." });
        return;
      }
      if (result.kind === "conflict") {
        res.status(409).json({ error: "Completed or already-cancelled bookings cannot be cancelled." });
        return;
      }
      await sendEmail({
        to: [result.studentEmail],
        cc: [result.guardianEmail],
        subject: `Booking cancelled: ${result.business.name}`,
        text: `A resident cancelled their booking for ${result.business.name}. The booking status is now cancelled. Open your Launch Lane dashboard to review the update.`,
      });
      res.json(
        CancelBookingResponse.parse(
          residentBookingResponse(
            result.booking,
            result.business.name,
            result.business.category,
            result.studentName,
          ),
        ),
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not cancel booking");
      res.status(500).json({ error: "We couldn't cancel this booking." });
    }
  },
);

export default router;
