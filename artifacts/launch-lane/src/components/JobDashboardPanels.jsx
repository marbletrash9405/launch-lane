import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyJobsQueryKey, getGetMyJobApplicationsQueryKey, getGetPublicJobsQueryKey,
  useGetMyJobs, useGetMyJobApplications, useChooseJobApplicant, useCloseMyJob, useWithdrawJobApplication,
} from "@workspace/api-client-react";

const jobStatus = { pending_review: "In review", open: "Open", filled: "Filled", closed: "Closed", rejected: "Needs changes" };
const applicationStatus = { pending_review: "Under safety review", applied: "Approved · sent to resident", rejected: "Not approved", chosen: "Selected", guardian_approved: "Guardian approved", declined: "Not selected", withdrawn: "Withdrawn" };

function JobLoading() { return <div className="booking-skeleton" aria-label="Loading jobs"><span /><span /></div>; }

export function ResidentJobs() {
  const queryClient = useQueryClient();
  const query = useGetMyJobs({ query: { queryKey: getGetMyJobsQueryKey(), refetchInterval: 30000 } });
  const chooseApplicant = useChooseJobApplicant();
  const closeJob = useCloseMyJob();
  const [error, setError] = useState("");
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetMyJobsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetMyJobApplicationsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetPublicJobsQueryKey() }),
    ]);
  }
  async function act(fn, args) {
    setError("");
    try { await fn.mutateAsync(args); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "We couldn't update this job."); }
  }
  const jobs = query.data?.jobs ?? [];
  return <section className="booking-section"><div className="phase-section-title"><div><p className="eyebrow">Your neighborhood plans</p><h2>Your jobs and applicants</h2></div><Link href="/residents#post-a-job" className="btn btn-teal btn-sm">Post a job</Link></div>
    {error && <p className="phase-error" role="alert">{error}</p>}
    {query.isLoading ? <JobLoading /> : query.isError ? <div className="phase-empty" role="alert"><p>We couldn't load your jobs.</p><button type="button" className="text-button" onClick={() => query.refetch()}>Try again</button></div> :
      jobs.length ? <div className="booking-list">{jobs.map((job) => <article className="booking-card" key={job.id} data-testid={`card-resident-job-${job.id}`}>
        <div className="booking-card-head"><div><p className="booking-business">{job.category}</p><h3>{job.title}</h3></div><span className={`status-pill job-status-${job.status}`}>{jobStatus[job.status] ?? job.status}</span></div>
        <p>{job.description}</p><p className="booking-timing"><strong>When</strong>{job.timing}<strong>Pay</strong>{job.payText}</p>
        {job.rejectionReason && <p className="rejection-note"><strong>Review note</strong>{job.rejectionReason}</p>}
        {(() => {
          const visibleApplications = job.applications.filter((app) => !["pending_review", "rejected", "withdrawn"].includes(app.status));
          return <div className="applicant-list"><h4>Applications <span className="phase-count">{visibleApplications.length}</span></h4>
          {visibleApplications.length ? visibleApplications.map((app) => <div className="applicant-row" key={app.id}><div><strong>{app.studentFirstName}, age {app.age}</strong><span className={`status-pill application-status-${app.status}`}>{applicationStatus[app.status] ?? app.status}</span><p>{app.message}</p></div>
            {job.status === "open" && app.status === "applied" && <button type="button" className="btn btn-teal btn-sm" disabled={chooseApplicant.isPending} onClick={() => act(chooseApplicant, { jobId: job.id, applicationId: app.id })}>Choose student</button>}
          </div>) : <p className="phase-help">No approved applications to review yet.</p>}
        </div>;
        })()}
        {(job.status === "open" || job.status === "pending_review") && <div className="booking-actions"><button type="button" className="btn btn-outline btn-sm" disabled={closeJob.isPending} onClick={() => act(closeJob, { jobId: job.id })}>Close job</button></div>}
      </article>)}</div> : <div className="phase-empty booking-empty"><p className="eyebrow">A good place to start</p><h3>Your job postings will live here.</h3><p>Post a clear description, timing, and pay so students know what to expect.</p><Link href="/residents#post-a-job" className="btn btn-teal">Post a job</Link></div>}
  </section>;
}

export function StudentJobApplications() {
  const queryClient = useQueryClient();
  const query = useGetMyJobApplications({ query: { queryKey: getGetMyJobApplicationsQueryKey(), refetchInterval: 30000 } });
  const withdraw = useWithdrawJobApplication();
  const [error, setError] = useState("");
  async function cancel(applicationId) {
    setError("");
    try {
      await withdraw.mutateAsync({ applicationId });
      await queryClient.invalidateQueries({ queryKey: getGetMyJobApplicationsQueryKey() });
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't withdraw your application."); }
  }
  const applications = query.data?.applications ?? [];
  return <section className="booking-section"><div className="phase-section-title"><div><p className="eyebrow">Your next step</p><h2>Job applications</h2></div><Link href="/explore?type=job" className="btn btn-teal btn-sm">Explore jobs</Link></div>
    {error && <p className="phase-error" role="alert">{error}</p>}
    {query.isLoading ? <JobLoading /> : query.isError ? <div className="phase-empty" role="alert"><p>We couldn't load your applications.</p><button type="button" className="text-button" onClick={() => query.refetch()}>Try again</button></div> :
      applications.length ? <div className="booking-list">{applications.map((app) => <article className="booking-card" key={app.id}><div className="booking-card-head"><div><p className="booking-business">{app.category}</p><h3>{app.jobTitle}</h3></div><span className={`status-pill application-status-${app.status}`}>{applicationStatus[app.status] ?? app.status}</span></div><p>{app.message}</p>{app.status === "rejected" && app.rejectionReason && <p className="rejection-note"><strong>Review note</strong>{app.rejectionReason}</p>}<p className="phase-help">Applied {new Date(app.createdAt).toLocaleDateString()}</p>{["pending_review", "applied", "chosen"].includes(app.status) && <div className="booking-actions"><button type="button" className="btn btn-outline btn-sm" disabled={withdraw.isPending} onClick={() => cancel(app.id)}>Withdraw application</button></div>}</article>)}</div> :
        <div className="phase-empty booking-empty"><p className="eyebrow">Start with a nearby opportunity</p><h3>Your applications will show here.</h3><p>Choose a job that feels right and tell the resident why you're a good fit.</p><Link href="/explore?type=job" className="btn btn-teal">Browse jobs</Link></div>}
  </section>;
}
