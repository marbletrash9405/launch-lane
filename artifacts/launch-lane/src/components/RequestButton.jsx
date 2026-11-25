"use client";

import { useRef, useState } from "react";
import SubmitForm from "./SubmitForm";
import { CloseIcon } from "./Icons";

// "Book" (resident → student service) or "Apply" (student → resident's job).
// Opens a form; the request is emailed to the Launch Lane team first, not straight to the lister.
export default function RequestButton({ listing }) {
  const ref = useRef(null);
  const [key, setKey] = useState(0); // remount the form each time it opens
  const isOffer = listing.type === "offering";
  const uid = `l${listing.id}`;

  const open = () => {
    setKey((k) => k + 1);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" className={`btn btn-sm ${isOffer ? "btn-teal" : "btn-blue"}`} onClick={open} data-testid={`button-request-${uid}`}>
        {isOffer ? "Book" : "Apply"}
      </button>

      <dialog
        ref={ref}
        className="modal"
        aria-labelledby={`${uid}-title`}
        onClick={(e) => { if (e.target === ref.current) close(); }}
      >
        <div className="modal-body">
          <button type="button" className="modal-close" onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
          <p className="eyebrow">{isOffer ? "Book a service" : "Apply for a job"}</p>
          <h2 id={`${uid}-title`}>{listing.title}</h2>
          <p className="modal-note">
            Your {isOffer ? "request" : "application"} goes to the Launch Lane team first. We&apos;ll
            review it and then connect you with {listing.name}.
          </p>

          <SubmitForm
            key={key}
            kind={isOffer ? "booking-request" : "job-application"}
            listingId={listing.id}
            compact
            onDone={close}
            submitLabel={isOffer ? "Send request" : "Send application"}
            submitClass={isOffer ? "btn-teal" : "btn-blue"}
            successTitle={isOffer ? "Request sent" : "Application sent"}
            successBody="Thanks! We'll review it and get back to you by email."
          >
            {isOffer ? (
              <>
                <div className="row-2">
                  <div className="field">
                    <label htmlFor={`${uid}-name`}>Your name</label>
                    <input className="input" id={`${uid}-name`} name="name" required autoComplete="name" />
                  </div>
                  <div className="field">
                    <label htmlFor={`${uid}-email`}>Email</label>
                    <input className="input" id={`${uid}-email`} name="email" type="email" required autoComplete="email" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={`${uid}-address`}>Home address</label>
                  <input className="input" id={`${uid}-address`} name="address" required autoComplete="street-address" />
                  <span className="hint">Used to check you live in Mercer Crossing. Not shared with the student.</span>
                </div>
                <div className="field">
                  <label htmlFor={`${uid}-timing`}>When do you need it? <span className="optional">(optional)</span></label>
                  <input className="input" id={`${uid}-timing`} name="timing" placeholder="e.g. Saturdays, starting next week" />
                </div>
                <div className="field">
                  <label htmlFor={`${uid}-message`}>Message</label>
                  <textarea className="textarea" id={`${uid}-message`} name="message" required
                    placeholder="What you need done, and any questions for the student." />
                </div>
              </>
            ) : (
              <>
                <div className="row-2">
                  <div className="field">
                    <label htmlFor={`${uid}-name`}>Your name</label>
                    <input className="input" id={`${uid}-name`} name="name" required autoComplete="name" />
                  </div>
                  <div className="field">
                    <label htmlFor={`${uid}-age`}>Age</label>
                    <input className="input" id={`${uid}-age`} name="age" type="number" min="10" max="18" required />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={`${uid}-email`}>Your email</label>
                  <input className="input" id={`${uid}-email`} name="email" type="email" required autoComplete="email" />
                </div>
                <div className="row-2">
                  <div className="field">
                    <label htmlFor={`${uid}-gname`}>Guardian name</label>
                    <input className="input" id={`${uid}-gname`} name="guardianName" required />
                  </div>
                  <div className="field">
                    <label htmlFor={`${uid}-gemail`}>Guardian email</label>
                    <input className="input" id={`${uid}-gemail`} name="guardianEmail" type="email" required />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={`${uid}-message`}>Why you&apos;re a good fit</label>
                  <textarea className="textarea" id={`${uid}-message`} name="message" required
                    placeholder="Mention work you've done that relates to this job, e.g. mowing your family's lawn." />
                </div>
              </>
            )}
          </SubmitForm>
        </div>
      </dialog>
    </>
  );
}
