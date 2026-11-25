"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyBookingsQueryKey, getGetMyJobApplicationsQueryKey, getGetMyJobsQueryKey, getGetPublicJobsQueryKey,
  useCreateBooking, useCreateJobApplication,
} from "@workspace/api-client-react";
import { CloseIcon } from "./Icons";

// "Book" (resident → student service) or "Apply" (student → resident's job).
export default function RequestButton({ listing }) {
  const ref = useRef(null);
  const [account, setAccount] = useState(null);
  const [accountMissing, setAccountMissing] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountRefresh, setAccountRefresh] = useState(0);
  const [message, setMessage] = useState("");
  const [hasOtherJob, setHasOtherJob] = useState(null);
  const [otherJobDetails, setOtherJobDetails] = useState("");
  const [availability, setAvailability] = useState("");
  const [preferredTiming, setPreferredTiming] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSent, setBookingSent] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const createBooking = useCreateBooking();
  const createApplication = useCreateJobApplication();
  const isOffer = listing.type === "offering";
  const uid = `l${listing.id}`;

  useEffect(() => {
    if (!dialogOpen || !isLoaded || !isSignedIn) {
      setAccount(null);
      setAccountMissing(false);
      setAccountLoading(false);
      return;
    }
    let active = true;
    setAccountLoading(true);
    setAccountError("");
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (response.status === 404) return { needsSignup: true };
        if (!response.ok) throw new Error(data?.error || "We couldn't check your Launch Lane account.");
        return { account: data };
      })
      .then((result) => {
        if (!active) return;
        if (result.needsSignup) setAccountMissing(true);
        else setAccount(result.account);
      })
      .catch((error) => { if (active) setAccountError(error instanceof Error ? error.message : "We couldn't check your Launch Lane account."); })
      .finally(() => { if (active) setAccountLoading(false); });
    return () => { active = false; };
  }, [dialogOpen, isLoaded, isSignedIn, accountRefresh]);

  const open = () => {
    setDialogOpen(true);
    setMessage("");
    setPreferredTiming("");
    setAccountMissing(false);
    setBookingError("");
    setBookingSent(false);
    ref.current?.showModal();
  };
  const close = () => {
    setDialogOpen(false);
    ref.current?.close();
  };

  async function submitBooking(event) {
    event.preventDefault();
    setBookingError("");
    try {
      await createBooking.mutateAsync({
        data: {
          businessId: String(listing.id),
          message: message.trim(),
          preferredTiming: preferredTiming.trim(),
        },
      });
      setBookingSent(true);
      await queryClient.invalidateQueries({ queryKey: getGetMyBookingsQueryKey() });
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "We couldn't send your request. Please try again.");
    }
  }

  async function submitApplication(event) {
    event.preventDefault();
    setBookingError("");
    try {
      if (hasOtherJob === null) { setBookingError("Let us know whether you have another job."); return; }
      await createApplication.mutateAsync({ jobId: String(listing.id), data: {
        message: message.trim(),
        hasOtherJob,
        ...(hasOtherJob ? { otherJobDetails: otherJobDetails.trim() } : {}),
        availability: availability.trim(),
      } });
      setBookingSent(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetMyJobApplicationsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetMyJobsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetPublicJobsQueryKey() }),
      ]);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "We couldn't send your application. Please try again.");
    }
  }

  return (
    <>
      <button type="button" className={`btn btn-sm ${isOffer ? "btn-teal" : "btn-blue"}`} onClick={open} data-testid={`button-request-${uid}`}>
        {isOffer ? "Book" : "Apply"}
      </button>
      <dialog ref={ref} className="modal" aria-labelledby={`${uid}-title`} onClose={() => setDialogOpen(false)} onClick={(event) => { if (event.target === ref.current) close(); }}>
        <div className="modal-body">
          <button type="button" className="modal-close" onClick={close} aria-label="Close" data-testid={`button-close-request-${uid}`}><CloseIcon /></button>
          {isOffer ? (
            <>
              <p className="eyebrow">Book a service</p>
              <h2 id={`${uid}-title`}>{listing.title}</h2>
              <p className="modal-note">Your request goes to {listing.name}. Share what you need and a good time to connect.</p>
              {!isLoaded ? <p className="modal-note">Checking your sign-in…</p> : !isSignedIn ? (
                <div className="booking-signin">
                  <p>Log in or sign up as a resident to book a student service.</p>
                  <div className="phase-actions">
                    <Link href="/login" className="btn btn-teal" data-testid={`link-login-to-book-${uid}`}>Log in</Link>
                    <Link href="/signup?role=resident" className="btn btn-outline" data-testid={`link-signup-resident-${uid}`}>Sign up as a resident</Link>
                  </div>
                </div>
              ) : accountMissing ? (
                <div className="booking-signin"><p>Choose Resident on sign-up before booking.</p><Link href="/signup?role=resident" className="btn btn-teal" data-testid={`link-finish-resident-signup-${uid}`}>Sign up as a resident</Link></div>
              ) : accountLoading ? <p className="modal-note" role="status">Checking your Launch Lane account…</p> : accountError ? (
                <div className="booking-signin"><p className="form-error" role="alert">{accountError}</p><button type="button" className="text-button" onClick={() => { setAccountError(""); setAccountRefresh((value) => value + 1); }} data-testid={`button-retry-account-${uid}`}>Try again</button></div>
              ) : !account?.role ? (
                <p className="modal-note">We couldn&apos;t confirm your account type. Please try again in a moment.</p>
              ) : account.role !== "resident" ? (
                <p className="booking-signin" role="status">Only residents can book student services.</p>
              ) : !account.profileComplete ? (
                <div className="booking-signin"><p>Complete your resident profile before booking.</p><Link href="/complete-profile" className="btn btn-teal" data-testid={`link-complete-resident-profile-${uid}`}>Complete profile</Link></div>
              ) : bookingSent ? (
                <div className="success" role="status" data-testid={`success-booking-${uid}`}><h2>Request sent</h2><p>Your request is on its way. You can follow its status from your dashboard.</p><button className="btn btn-teal" type="button" onClick={close}>Done</button></div>
              ) : (
                <form className="form" onSubmit={submitBooking} data-testid={`form-booking-${uid}`}>
                  <div className="field">
                    <label htmlFor={`${uid}-timing`}>When do you need it? <span className="optional">(optional)</span></label>
                    <input className="input" id={`${uid}-timing`} name="preferredTiming" maxLength="300" value={preferredTiming} onChange={(event) => setPreferredTiming(event.target.value)} placeholder="e.g. Saturdays, starting next week" data-testid={`input-booking-timing-${uid}`} />
                  </div>
                  <div className="field">
                    <label htmlFor={`${uid}-message`}>Message</label>
                    <textarea className="textarea" id={`${uid}-message`} name="message" required minLength="3" maxLength="2000" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What you need done, and any questions for the student." data-testid={`input-booking-message-${uid}`} />
                  </div>
                  {bookingError && <p className="form-error" role="alert" data-testid={`error-booking-${uid}`}>{bookingError}</p>}
                  <button type="submit" className="btn btn-teal" disabled={createBooking.isPending} data-testid={`button-send-booking-${uid}`}>{createBooking.isPending ? "Sending…" : "Send request"}</button>
                </form>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">{listing.businessName ? `Apply to join ${listing.businessName}` : "Apply for a job"}</p>
              <h2 id={`${uid}-title`}>{listing.title}</h2>
              <p className="modal-note">{listing.businessName
                ? `Launch Lane reviews your application first, then sends it to the owner of ${listing.businessName}. Your guardian will be asked to approve before you join.`
                : "Launch Lane reviews your application first, then sends it to the resident. Your guardian will be asked to approve before you take the job."}</p>
              {!isLoaded ? <p className="modal-note">Checking your sign-in…</p> : !isSignedIn ? (
                <div className="booking-signin"><p>Log in or sign up as a student to apply for this neighborhood job.</p><div className="phase-actions"><Link href="/login" className="btn btn-teal">Log in</Link><Link href="/signup?role=student" className="btn btn-outline">Sign up as a student</Link></div></div>
              ) : accountMissing ? (
                <div className="booking-signin"><p>Choose Student on sign-up before applying.</p><Link href="/signup?role=student" className="btn btn-teal">Sign up as a student</Link></div>
              ) : accountLoading ? <p className="modal-note" role="status">Checking your Launch Lane account…</p> : accountError ? (
                <div className="booking-signin"><p className="form-error" role="alert">{accountError}</p><button type="button" className="text-button" onClick={() => { setAccountError(""); setAccountRefresh((value) => value + 1); }}>Try again</button></div>
              ) : account?.role !== "student" ? (
                <div className="booking-signin" role="status"><p>Only student accounts can apply for neighborhood jobs.</p><Link href="/dashboard" className="btn btn-outline">Open your dashboard</Link></div>
              ) : !account.profileComplete ? (
                <div className="booking-signin"><p>Complete your student profile before applying.</p><Link href="/complete-profile" className="btn btn-teal">Complete profile</Link></div>
              ) : bookingSent ? (
                <div className="success" role="status" data-testid={`success-application-${uid}`}><h2>Application sent</h2><p>Your application is in review. You can follow its status from your dashboard.</p><button className="btn btn-teal" type="button" onClick={close}>Done</button></div>
              ) : (
                <form className="form" onSubmit={submitApplication} data-testid={`form-application-${uid}`}>
                  <div className="field"><label htmlFor={`${uid}-message`}>Why you&apos;re a good fit</label><textarea className="textarea" id={`${uid}-message`} required minLength="3" maxLength="2000" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Mention work you've done that relates to this job." /></div>
                  <fieldset className="field" data-testid={`field-other-job-${uid}`}><legend>Do you have another job right now?</legend>
                    <div className="phase-actions">
                      <label><input type="radio" name={`${uid}-other-job`} checked={hasOtherJob === false} onChange={() => setHasOtherJob(false)} required /> No</label>
                      <label><input type="radio" name={`${uid}-other-job`} checked={hasOtherJob === true} onChange={() => setHasOtherJob(true)} /> Yes</label>
                    </div>
                  </fieldset>
                  {hasOtherJob && <div className="field"><label htmlFor={`${uid}-other-job-details`}>What is it, and when do you work?</label><input className="input" id={`${uid}-other-job-details`} required minLength="2" maxLength="500" value={otherJobDetails} onChange={(event) => setOtherJobDetails(event.target.value)} placeholder="e.g. Lifeguard, Sat–Sun 9am–2pm" /></div>}
                  <div className="field"><label htmlFor={`${uid}-availability`}>When are you available?</label><input className="input" id={`${uid}-availability`} required minLength="2" maxLength="500" value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="e.g. Weekdays after 4pm, Saturday mornings" /></div>
                  <p className="phase-help">Your age comes from your profile. Launch Lane and the poster see it with your application.</p>
                  {bookingError && <p className="form-error" role="alert">{bookingError}</p>}
                  <button type="submit" className="btn btn-blue" disabled={createApplication.isPending}>{createApplication.isPending ? "Sending…" : "Send application"}</button>
                </form>
              )}
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
