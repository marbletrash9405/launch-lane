"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetIncomingBookingsQueryKey,
  getGetMyBookingsQueryKey,
  useCancelBooking,
  useGetIncomingBookings,
  useGetMyBookings,
  useUpdateBookingStatus,
} from "@workspace/api-client-react";

const statusNames = {
  requested: "Awaiting response",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
};

function BookingStatus({ booking }) {
  return <span className={`status-pill booking-status-${booking.status}`} data-testid={`status-booking-${booking.id}`}>{statusNames[booking.status] ?? booking.status}</span>;
}

function BookingSkeleton() {
  return <div className="booking-skeleton" aria-label="Loading bookings"><span /><span /><span /></div>;
}

export function IncomingBookings({ account }) {
  const queryClient = useQueryClient();
  const query = useGetIncomingBookings({
    query: {
      queryKey: getGetIncomingBookingsQueryKey(),
      enabled: account?.role === "student",
      refetchInterval: 30000,
    },
  });
  const updateStatus = useUpdateBookingStatus();
  const [actionError, setActionError] = useState("");
  const bookings = query.data?.bookings ?? [];

  async function update(bookingId, action) {
    setActionError("");
    try {
      await updateStatus.mutateAsync({ bookingId, data: { action } });
      await queryClient.invalidateQueries({ queryKey: getGetIncomingBookingsQueryKey() });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "We couldn't update this request. Please try again.");
    }
  }

  return (
    <section className="booking-section" aria-labelledby="incoming-bookings-title">
      <div className="phase-section-title">
        <div><p className="eyebrow">From your neighbors</p><h2 id="incoming-bookings-title">Booking requests</h2></div>
        <span className="phase-count" data-testid="count-incoming-bookings">{bookings.length} {bookings.length === 1 ? "request" : "requests"}</span>
      </div>
      {actionError && <p className="phase-error" role="alert" data-testid="error-incoming-booking-action">{actionError}</p>}
      {query.isLoading ? <BookingSkeleton /> : query.isError ? (
        <div className="phase-empty booking-empty" role="alert" data-testid="error-incoming-bookings">
          <p>We couldn&apos;t load your booking requests.</p>
          <button className="text-button" type="button" onClick={() => query.refetch()} data-testid="button-retry-incoming-bookings">Try again</button>
        </div>
      ) : bookings.length ? (
        <div className="booking-list">
          {bookings.map((booking) => (
            <article className="booking-card" key={booking.id} data-testid={`card-incoming-booking-${booking.id}`}>
              <div className="booking-card-head">
                <div><p className="booking-business">{booking.businessName}</p><h3>{booking.residentFirstName}{booking.residentStreetName ? <span className="booking-street"> · {booking.residentStreetName}</span> : null}</h3></div>
                 <BookingStatus booking={booking} />
              </div>
               <p className="booking-message" data-testid={`text-booking-message-${booking.id}`}>{booking.message}</p>
               <p className="booking-timing" data-testid={`text-booking-timing-${booking.id}`}><strong>Preferred timing</strong>{booking.preferredTiming || "Not specified"}</p>
              {booking.status === "requested" && (
                <div className="booking-actions">
                  <button type="button" className="btn btn-teal btn-sm" disabled={updateStatus.isPending} onClick={() => update(booking.id, "accept")} data-testid={`button-accept-booking-${booking.id}`}>Accept</button>
                  <button type="button" className="btn btn-outline btn-sm" disabled={updateStatus.isPending} onClick={() => update(booking.id, "decline")} data-testid={`button-decline-booking-${booking.id}`}>Decline</button>
                </div>
              )}
              {booking.status === "accepted" && (
                <div className="booking-actions"><button type="button" className="btn btn-teal btn-sm" disabled={updateStatus.isPending} onClick={() => update(booking.id, "complete")} data-testid={`button-complete-booking-${booking.id}`}>Mark completed</button></div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="phase-empty booking-empty" data-testid="empty-incoming-bookings"><p className="eyebrow">Nothing waiting</p><h3>New requests will show up here.</h3><p>When a neighbor books one of your live services, you can respond right from this page.</p></div>
      )}
    </section>
  );
}

export function ResidentBookings({ account }) {
  const queryClient = useQueryClient();
  const query = useGetMyBookings({
    query: {
      queryKey: getGetMyBookingsQueryKey(),
      enabled: account?.role === "resident",
      refetchInterval: 30000,
    },
  });
  const cancelBooking = useCancelBooking();
  const [actionError, setActionError] = useState("");
  const bookings = query.data?.bookings ?? [];

  async function cancel(bookingId) {
    setActionError("");
    try {
      await cancelBooking.mutateAsync({ bookingId });
      await queryClient.invalidateQueries({ queryKey: getGetMyBookingsQueryKey() });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "We couldn't cancel this booking. Please try again.");
    }
  }

  return (
    <section className="booking-section" aria-labelledby="resident-bookings-title">
      <div className="phase-section-title">
        <div><p className="eyebrow">Your neighborhood plans</p><h2 id="resident-bookings-title">Your bookings</h2></div>
        <span className="phase-count" data-testid="count-my-bookings">{bookings.length} {bookings.length === 1 ? "booking" : "bookings"}</span>
      </div>
      {actionError && <p className="phase-error" role="alert" data-testid="error-resident-booking-action">{actionError}</p>}
      {query.isLoading ? <BookingSkeleton /> : query.isError ? (
        <div className="phase-empty booking-empty" role="alert" data-testid="error-my-bookings">
          <p>We couldn&apos;t load your bookings.</p>
          <button className="text-button" type="button" onClick={() => query.refetch()} data-testid="button-retry-my-bookings">Try again</button>
        </div>
      ) : bookings.length ? (
        <div className="booking-list">
          {bookings.map((booking) => (
            <article className="booking-card" key={booking.id} data-testid={`card-my-booking-${booking.id}`}>
              <div className="booking-card-head">
                <div><p className="booking-business">{booking.category}</p><h3>{booking.businessName}</h3></div>
                 <BookingStatus booking={booking} />
              </div>
               <p className="booking-byline" data-testid={`text-booking-student-${booking.id}`}>Student: {booking.studentFirstName}</p>
               <p className="booking-message" data-testid={`text-booking-message-${booking.id}`}>{booking.message}</p>
               <p className="booking-timing" data-testid={`text-booking-timing-${booking.id}`}><strong>Preferred timing</strong>{booking.preferredTiming || "Not specified"}</p>
               {booking.status !== "completed" && booking.status !== "cancelled" && (
                <div className="booking-actions"><button type="button" className="btn btn-outline btn-sm" disabled={cancelBooking.isPending} onClick={() => cancel(booking.id)} data-testid={`button-cancel-booking-${booking.id}`}>Cancel booking</button></div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="phase-empty booking-empty" data-testid="empty-my-bookings"><p className="eyebrow">A little closer to home</p><h3>Your bookings will live here.</h3><p>Find a student service and send a note about what you need.</p></div>
      )}
    </section>
  );
}
