import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminBusinessesQueryKey, getGetAdminEmailLogQueryKey, getGetMyBusinessesQueryKey,
  getGetPublicBusinessesQueryKey, useGetAdminBusinesses, useGetAdminEmailLog,
  useReviewBusiness, useSetAdminBusinessPause,
  getGetAdminJobsQueryKey, getGetPublicJobsQueryKey, useGetAdminJobs, useReviewJob, useCloseAdminJob,
  getGetAdminJobApplicationsQueryKey, useGetAdminJobApplications, useReviewJobApplication,
  getGetAdminChatReportsQueryKey, useGetAdminChatReports, useDeleteAdminChatMessage, useSetAdminChatThreadLock,
} from "@workspace/api-client-react";

const statusText = { pending_review: "In review", pending_guardian: "Guardian approval", live: "Live", paused: "Paused", rejected: "Needs changes" };

function EmailBody({ text, emailId }) {
  const matches = [...text.matchAll(/(?:https?:\/\/[^\s]+)?\/guardian\/approval\/([a-zA-Z0-9_-]+)/g)];
  if (!matches.length) return <p className="email-body" data-testid={`text-email-body-${emailId}`}>{text}</p>;
  const parts = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const token = match[1];
    const full = match[0];
    const pathStart = full.lastIndexOf("/guardian/approval/");
    const linkPath = full.slice(pathStart).replace(/[.,!?;:)]+$/, "");
    const start = match.index;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<Link key={`${token}-${index}`} className="email-inline-link" href={linkPath} data-testid={`link-guardian-approval-${emailId}-${index}`}>{full}</Link>);
    cursor = start + full.length;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <p className="email-body" data-testid={`text-email-body-${emailId}`}>{parts}</p>;
}

export default function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [account, setAccount] = useState(null);
  const [authError, setAuthError] = useState("");
  const [expanded, setExpanded] = useState("");
  const [rejecting, setRejecting] = useState("");
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [applicationRejecting, setApplicationRejecting] = useState("");
  const queryClient = useQueryClient();
  const adminBusinesses = useGetAdminBusinesses({ query: { queryKey: getGetAdminBusinessesQueryKey(), enabled: account?.role === "admin" } });
  const emailLog = useGetAdminEmailLog({ query: { queryKey: getGetAdminEmailLogQueryKey(), enabled: account?.role === "admin" } });
  const review = useReviewBusiness();
  const pause = useSetAdminBusinessPause();
  const adminJobs = useGetAdminJobs({ query: { queryKey: getGetAdminJobsQueryKey(), enabled: account?.role === "admin" } });
  const reviewJob = useReviewJob();
  const closeJob = useCloseAdminJob();
  const applicationsQuery = useGetAdminJobApplications({ query: { queryKey: getGetAdminJobApplicationsQueryKey(), enabled: account?.role === "admin" } });
  const chatReportsQuery = useGetAdminChatReports({ query: { queryKey: getGetAdminChatReportsQueryKey(), enabled: account?.role === "admin" } });
  const reviewApplication = useReviewJobApplication();
  const deleteChatMessage = useDeleteAdminChatMessage();
  const lockChatThread = useSetAdminChatThreadLock();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLocation("/login"); return; }
    let active = true;
    fetch("/api/auth/me", { credentials: "include" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "We couldn't verify your account.");
      return body;
    }).then((body) => {
      if (!active) return;
      if (body.role !== "admin") { setAuthError("This workspace is available to Launch Lane administrators only."); return; }
      setAccount(body);
    }).catch((error) => { if (active) setAuthError(error instanceof Error ? error.message : "We couldn't verify your account."); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, setLocation]);

  async function refreshAdmin() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetAdminBusinessesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetPublicBusinessesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetMyBusinessesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminEmailLogQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminJobsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetPublicJobsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminJobApplicationsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminChatReportsQueryKey() }),
    ]);
  }

  async function decide(businessId, action, rejectReason) {
    setActionError("");
    try {
      await review.mutateAsync({ businessId, data: { action, ...(rejectReason ? { reason: rejectReason } : {}) } });
      setRejecting(""); setReason("");
      await refreshAdmin();
    } catch (error) { setActionError(error instanceof Error ? error.message : "The review could not be saved."); }
  }

  async function togglePause(business) {
    setActionError("");
    try {
      await pause.mutateAsync({ businessId: business.id, data: { paused: business.status !== "paused" } });
      await refreshAdmin();
    } catch (error) { setActionError(error instanceof Error ? error.message : "The listing could not be updated."); }
  }

  async function decideJob(jobId, action, rejectReason) {
    setActionError("");
    try {
      await reviewJob.mutateAsync({ jobId, data: { action, ...(rejectReason ? { reason: rejectReason } : {}) } });
      setRejecting(""); setReason("");
      await refreshAdmin();
    } catch (error) { setActionError(error instanceof Error ? error.message : "The job review could not be saved."); }
  }

  async function closeAdminJob(jobId) {
    setActionError("");
    try { await closeJob.mutateAsync({ jobId }); await refreshAdmin(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "The job could not be closed."); }
  }

  async function decideApplication(applicationId, action, rejectReason) {
    setActionError("");
    try {
      await reviewApplication.mutateAsync({ applicationId, data: { action, ...(rejectReason ? { reason: rejectReason } : {}) } });
      setApplicationRejecting("");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: getGetAdminJobApplicationsQueryKey() });
    } catch (error) { setActionError(error instanceof Error ? error.message : "The application review could not be saved."); }
  }

  async function removeReportedMessage(messageId) {
    setActionError("");
    if (!window.confirm("Delete this reported message from the conversation?")) return;
    try {
      await deleteChatMessage.mutateAsync({ messageId });
      await queryClient.invalidateQueries({ queryKey: getGetAdminChatReportsQueryKey() });
    } catch (error) { setActionError(error instanceof Error ? error.message : "The message could not be deleted."); }
  }

  async function setThreadLocked(threadId, currentlyLocked) {
    const locked = !currentlyLocked;
    setActionError("");
    try {
      await lockChatThread.mutateAsync({ threadId, data: { locked } });
      await queryClient.invalidateQueries({ queryKey: getGetAdminChatReportsQueryKey() });
    } catch (error) { setActionError(error instanceof Error ? error.message : "The conversation could not be updated."); }
  }

  if (!isLoaded || (isSignedIn && !account && !authError)) {
    return <section className="phase-admin"><div className="phase-wrap"><div className="phase-panel skeleton-panel" data-testid="loading-admin-access"><span /><span /><span /></div></div></section>;
  }
  if (!account || account.role !== "admin") {
    return <section className="phase-admin"><div className="phase-wrap"><div className="phase-access-denied" data-testid="admin-access-denied"><p className="eyebrow">Restricted workspace</p><h1>Administrator access only.</h1><p>{authError || "Please sign in with an administrator account."}</p><Link className="btn btn-outline" href="/dashboard" data-testid="link-admin-access-back">Back to dashboard</Link></div></div></section>;
  }

  const businesses = adminBusinesses.data?.businesses ?? [];
  const jobs = adminJobs.data?.jobs ?? [];
  const emails = emailLog.data?.emails ?? [];
  return (
    <section className="phase-admin">
      <div className="phase-wrap">
        <header className="admin-heading"><div><p className="eyebrow">Mercer Crossing / Operations</p><h1>Review desk</h1><p>Keep every listing clear, safe, and ready for the neighborhood.</p></div><Link href="/dashboard" className="admin-back" data-testid="link-admin-dashboard">Dashboard <span aria-hidden="true">↗</span></Link></header>
        {actionError && <p className="phase-error" role="alert" data-testid="error-admin-action">{actionError}</p>}
        <section className="admin-section">
          <div className="phase-section-title"><div><p className="eyebrow">01 / Moderation</p><h2>Student businesses</h2></div><span className="phase-count" data-testid="count-admin-businesses">{businesses.length} total</span></div>
          {adminBusinesses.isLoading ? <div className="phase-panel skeleton-panel" data-testid="loading-admin-businesses"><span /><span /><span /></div> :
            adminBusinesses.isError ? <div className="phase-empty" role="alert" data-testid="error-admin-businesses"><p>Business review data could not be loaded.</p><button type="button" className="text-button" onClick={() => adminBusinesses.refetch()} data-testid="button-retry-admin-businesses">Retry</button></div> :
              businesses.length ? <div className="admin-business-list">{businesses.map((business) => (
                <article className="admin-business" key={business.id} data-testid={`card-admin-business-${business.id}`}>
                  <div className="admin-business-top">
                    <div className="admin-business-identity"><div className="phase-business-photo">{business.logoUrl || business.photoUrls?.[0] ? <img src={business.logoUrl || business.photoUrls[0]} alt={business.logoUrl ? "Business logo" : ""} className={business.logoUrl ? "is-logo" : undefined} /> : <span>{business.category.slice(0, 1)}</span>}</div><div><p className="admin-owner" data-testid={`text-admin-owner-${business.id}`}>{business.ownerName} <span>· age {business.age}</span></p><h3 data-testid={`text-admin-business-name-${business.id}`}>{business.name}</h3><p className="business-category" data-testid={`text-admin-business-status-${business.id}`}>{business.category} <span>·</span> {statusText[business.status]}</p></div></div>
                    <button type="button" className="admin-detail-toggle" onClick={() => setExpanded(expanded === business.id ? "" : business.id)} aria-expanded={expanded === business.id} data-testid={`button-admin-details-${business.id}`}>{expanded === business.id ? "Hide details" : "Review details"}</button>
                  </div>
                  <div className="admin-description"><p>{business.description}</p><strong>{business.pricingText}</strong></div>
                  {expanded === business.id && <div className="admin-private-details" data-testid={`details-admin-private-${business.id}`}>
                    <div><span>Student email</span><strong data-testid={`text-admin-owner-email-${business.id}`}>{business.ownerEmail}</strong></div><div><span>Private address</span><strong data-testid={`text-admin-private-address-${business.id}`}>{business.privateAddress}</strong></div><div><span>Guardian</span><strong data-testid={`text-admin-guardian-name-${business.id}`}>{business.guardianName}</strong></div><div><span>Guardian email</span><strong data-testid={`text-admin-guardian-email-${business.id}`}>{business.guardianEmail}</strong></div><div><span>Submitted</span><strong>{new Date(business.createdAt).toLocaleString()}</strong></div>
                  </div>}
                  {business.rejectionReason && <p className="admin-rejection" data-testid={`text-admin-rejection-${business.id}`}>Previous review: {business.rejectionReason}</p>}
                  <div className="admin-actions">
                    {business.status === "pending_review" && <><button type="button" className="btn btn-teal btn-sm" disabled={review.isPending} onClick={() => decide(business.id, "approve")} data-testid={`button-approve-business-${business.id}`}>Approve</button>{rejecting === business.id ? <div className="reject-form"><input className="input" maxLength="1000" placeholder="Reason for the student" value={reason} onChange={(e) => setReason(e.target.value)} data-testid={`input-reject-reason-${business.id}`} /><button type="button" className="btn btn-sm btn-danger" disabled={review.isPending || !reason.trim()} onClick={() => decide(business.id, "reject", reason.trim())} data-testid={`button-confirm-reject-${business.id}`}>Confirm rejection</button><button type="button" className="text-button" onClick={() => { setRejecting(""); setReason(""); }} data-testid={`button-cancel-reject-${business.id}`}>Cancel</button></div> : <button type="button" className="btn btn-sm btn-outline" onClick={() => setRejecting(business.id)} data-testid={`button-reject-business-${business.id}`}>Reject</button>}</>}
                    {business.status === "pending_guardian" && <span className="admin-updated" data-testid={`text-guardian-pending-${business.id}`}>Waiting for guardian approval</span>}
                    {["live", "paused"].includes(business.status) && <button type="button" className="btn btn-sm btn-outline" disabled={pause.isPending} onClick={() => togglePause(business)} data-testid={`button-admin-pause-${business.id}`}>{business.status === "paused" ? "Resume listing" : "Pause listing"}</button>}
                    <span className="admin-updated">Updated {new Date(business.updatedAt).toLocaleDateString()}</span>
                  </div>
                </article>
              ))}</div> : <div className="phase-empty" data-testid="empty-admin-businesses"><p className="eyebrow">All caught up</p><h2>No businesses to review.</h2><p>New student listings will appear here.</p></div>}
        </section>
        <section className="admin-section">
          <div className="phase-section-title"><div><p className="eyebrow">02 / Moderation</p><h2>Neighborhood jobs</h2></div><span className="phase-count">{jobs.length} total</span></div>
          {adminJobs.isLoading ? <div className="phase-panel skeleton-panel"><span /><span /><span /></div> :
            adminJobs.isError ? <div className="phase-empty" role="alert"><p>Job review data could not be loaded.</p><button type="button" className="text-button" onClick={() => adminJobs.refetch()}>Retry</button></div> :
              jobs.length ? <div className="admin-business-list">{jobs.map((job) => (
                <article className="admin-business admin-job" key={job.id} data-testid={`card-admin-job-${job.id}`}>
                  <div className="admin-business-top"><div><p className="admin-owner">{job.residentName} <span>· {job.residentEmail}</span></p><h3>{job.title}</h3><p className="business-category">{job.businessName ? <>Opening at {job.businessName} <span>·</span> </> : null}{job.category} <span>·</span> {job.status}</p></div><button type="button" className="admin-detail-toggle" aria-expanded={expanded === `job-${job.id}`} onClick={() => setExpanded(expanded === `job-${job.id}` ? "" : `job-${job.id}`)}>{expanded === `job-${job.id}` ? "Hide details" : "Review details"}</button></div>
                  <div className="admin-description"><p>{job.description}</p><strong>{job.payText}</strong></div>
                  <p className="booking-timing"><strong>When</strong>{job.timing}<strong>Street</strong>{job.residentStreetName || "Mercer Crossing"}</p>
                  {expanded === `job-${job.id}` && <div className="admin-private-details"><div><span>{job.businessName ? "Owner email" : "Resident email"}</span><strong>{job.residentEmail}</strong></div><div><span>Private address</span><strong>{job.privateAddress}</strong></div><div><span>Submitted</span><strong>{new Date(job.createdAt).toLocaleString()}</strong></div></div>}
                  {job.rejectionReason && <p className="admin-rejection">Previous review: {job.rejectionReason}</p>}
                  <div className="admin-actions">
                    {job.status === "pending_review" && <><button type="button" className="btn btn-teal btn-sm" disabled={reviewJob.isPending} onClick={() => decideJob(job.id, "approve")}>Approve</button>{rejecting === `job-${job.id}` ? <div className="reject-form"><input className="input" maxLength="1000" placeholder="Reason for the resident" value={reason} onChange={(e) => setReason(e.target.value)} /><button type="button" className="btn btn-sm btn-danger" disabled={reviewJob.isPending || !reason.trim()} onClick={() => decideJob(job.id, "reject", reason.trim())}>Confirm rejection</button><button type="button" className="text-button" onClick={() => { setRejecting(""); setReason(""); }}>Cancel</button></div> : <button type="button" className="btn btn-sm btn-outline" onClick={() => { setRejecting(`job-${job.id}`); setReason(""); }}>Reject</button>}</>}
                    {job.status === "open" && <button type="button" className="btn btn-sm btn-outline" disabled={closeJob.isPending} onClick={() => closeAdminJob(job.id)}>Close job</button>}
                    <span className="admin-updated">Updated {new Date(job.updatedAt).toLocaleDateString()}</span>
                  </div>
                </article>
              ))}</div> : <div className="phase-empty"><p className="eyebrow">All caught up</p><h2>No jobs to review.</h2><p>New resident job postings will appear here.</p></div>}
        </section>
        <section className="admin-section">
          <div className="phase-section-title"><div><p className="eyebrow">03 / Student safety</p><h2>Job applications</h2><p className="phase-help">Review student applications before they can move forward.</p></div><span className="phase-count">{applicationsQuery.data?.applications?.length ?? 0} in queue</span></div>
          {applicationsQuery.isLoading ? <div className="phase-panel skeleton-panel"><span /><span /><span /></div> :
            applicationsQuery.isError ? <div className="phase-empty" role="alert"><p>Job applications could not be loaded.</p><button type="button" className="text-button" onClick={() => applicationsQuery.refetch()}>Retry</button></div> :
              applicationsQuery.data?.applications?.length ? <div className="admin-business-list">{applicationsQuery.data.applications.map((application) => <article className="admin-business" key={application.id}>
                <div className="admin-business-top"><div><p className="admin-owner">{application.studentFirstName}, age {application.age}</p><h3>{application.jobTitle}{application.businessName ? ` · ${application.businessName}` : ""}</h3><p className="business-category">{application.businessName ? "Business opening · " : ""}{application.status.replaceAll("_", " ")} · submitted {new Date(application.createdAt).toLocaleDateString()}</p></div><button className="admin-detail-toggle" type="button" aria-expanded={expanded === `application-${application.id}`} onClick={() => setExpanded(expanded === `application-${application.id}` ? "" : `application-${application.id}`)}>{expanded === `application-${application.id}` ? "Hide private details" : "Admin-only details"}</button></div>
                <div className="admin-description"><p>{application.message}</p><p><strong>Other job:</strong> {application.hasOtherJob ? `Yes, ${application.otherJobDetails}` : application.availability ? "No" : "Not asked"}</p>{application.availability && <p><strong>Availability:</strong> {application.availability}</p>}</div>
                {expanded === `application-${application.id}` && <div className="admin-private-details"><div><span>Student first name</span><strong>{application.studentFirstName}</strong></div><div><span>Student email</span><strong>{application.studentEmail}</strong></div><div><span>Age</span><strong>{application.age}</strong></div><div><span>Private address</span><strong>{application.privateAddress}</strong></div><div><span>Guardian</span><strong>{application.guardianName}</strong></div><div><span>Guardian email</span><strong>{application.guardianEmail}</strong></div></div>}
                {application.rejectionReason && <p className="admin-rejection">Previous review: {application.rejectionReason}</p>}
                {application.status === "pending_review" && <div className="admin-actions"><button type="button" className="btn btn-teal btn-sm" disabled={reviewApplication.isPending} onClick={() => decideApplication(application.id, "approve")}>Approve application</button>{applicationRejecting === application.id ? <div className="reject-form"><input className="input" maxLength="1000" placeholder="Reason for the student" value={reason} onChange={(event) => setReason(event.target.value)} /><button type="button" className="btn btn-sm btn-danger" disabled={reviewApplication.isPending || !reason.trim()} onClick={() => decideApplication(application.id, "reject", reason.trim())}>Confirm rejection</button><button type="button" className="text-button" onClick={() => { setApplicationRejecting(""); setReason(""); }}>Cancel</button></div> : <button type="button" className="btn btn-sm btn-outline" disabled={reviewApplication.isPending} onClick={() => { setApplicationRejecting(application.id); setReason(""); }}>Reject application</button>}</div>}
              </article>)}</div> : <div className="phase-empty"><p className="eyebrow">All caught up</p><h2>No applications waiting for review.</h2><p>Pending student applications will appear here.</p></div>}
        </section>
        <section className="admin-section">
          <div className="phase-section-title"><div><p className="eyebrow">04 / Safety reports</p><h2>Reported chat messages</h2><p className="phase-help">Only administrators can see report details and take moderation action.</p></div><button type="button" className="admin-refresh" onClick={() => chatReportsQuery.refetch()} disabled={chatReportsQuery.isFetching}>Refresh reports</button></div>
          {chatReportsQuery.isLoading ? <div className="phase-panel skeleton-panel"><span /><span /><span /></div> :
            chatReportsQuery.isError ? <div className="phase-empty" role="alert"><p>Chat reports could not be loaded.</p><button type="button" className="text-button" onClick={() => chatReportsQuery.refetch()}>Retry</button></div> :
              chatReportsQuery.data?.reports?.length ? <div className="admin-business-list">{chatReportsQuery.data.reports.map((report) => <article className="admin-business report-card" key={report.id}>
                <div className="admin-business-top"><div><p className="admin-owner">{report.senderFirstName} <span>· {report.senderRole}</span></p><h3>Reported by {report.reporterFirstName}</h3><p className="business-category">{new Date(report.createdAt).toLocaleString()}</p></div><Link className="admin-detail-toggle" href={`/messages/${report.threadId}`}>Open conversation</Link></div>
                <blockquote className="reported-message">{report.messageText}</blockquote><p className="phase-help"><strong>Reason:</strong> {report.reason || "No reason provided"}</p>
                <div className="admin-actions"><button type="button" className="btn btn-sm btn-danger" disabled={deleteChatMessage.isPending} onClick={() => removeReportedMessage(report.messageId)}>Delete message</button><button type="button" className="btn btn-sm btn-outline" disabled={lockChatThread.isPending} onClick={() => setThreadLocked(report.threadId, report.locked)}>{report.locked ? "Unlock conversation" : "Lock conversation"}</button></div>
              </article>)}</div> : <div className="phase-empty"><p className="eyebrow">No reports</p><h2>No reported messages.</h2><p>New chat reports will appear here for review.</p></div>}
        </section>
        <section className="admin-section email-section">
          <div className="phase-section-title"><div><p className="eyebrow">05 / Delivery checks</p><h2>Email log</h2><p className="phase-help">The database keeps the latest 500 email attempts, including after a restart.</p></div><button type="button" className="admin-refresh" onClick={() => emailLog.refetch()} disabled={emailLog.isFetching} data-testid="button-refresh-email-log">{emailLog.isFetching ? "Refreshing…" : "Refresh log"}</button></div>
          {emailLog.data?.notice && <p className="email-notice" data-testid="notice-email-log">{emailLog.data.notice}</p>}
          {emailLog.isLoading ? <div className="phase-panel skeleton-panel" data-testid="loading-email-log"><span /><span /><span /></div> :
            emailLog.isError ? <div className="phase-empty" role="alert" data-testid="error-email-log"><p>The email log could not be loaded.</p><button type="button" className="text-button" onClick={() => emailLog.refetch()} data-testid="button-retry-email-log">Try again</button></div> :
              emails.length ? <div className="email-log">{emails.map((email) => <article className="email-entry" key={email.id} data-testid={`card-email-log-${email.id}`}><div className="email-entry-head"><div><p className="email-date" data-testid={`text-email-created-${email.id}`}>{new Date(email.createdAt).toLocaleString()}</p><h3 data-testid={`text-email-subject-${email.id}`}>{email.subject}</h3></div><span className={`email-status email-${email.status}`} data-testid={`status-email-${email.id}`}>{email.status}</span></div><dl className="email-addresses"><dt>To</dt><dd data-testid={`text-email-to-${email.id}`}>{email.to.join(", ") || "—"}</dd>{email.cc.length > 0 && <><dt>CC</dt><dd data-testid={`text-email-cc-${email.id}`}>{email.cc.join(", ")}</dd></>}</dl><EmailBody text={email.text} emailId={email.id} />{email.detail && <p className="email-detail" data-testid={`text-email-detail-${email.id}`}>{email.detail}</p>}</article>)}</div> : <div className="phase-empty" data-testid="empty-email-log"><p className="eyebrow">Nothing logged yet</p><h2>No test emails on record.</h2><p>Email events will show here when the API records them.</p></div>}
        </section>
      </div>
    </section>
  );
}
