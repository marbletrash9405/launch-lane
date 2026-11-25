import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyJobsQueryKey, getGetMyJobApplicationsQueryKey, getGetPublicJobsQueryKey, getGetMyBusinessOpeningsQueryKey,
  useGetMyJobs, useGetMyJobApplications, useChooseJobApplicant, useCloseMyJob, useWithdrawJobApplication,
  useGetMyBusinessOpenings, useCreateBusinessOpening,
} from "@workspace/api-client-react";
import { categories } from "@/data/categories";

const jobStatus = { pending_review: "In review", open: "Open", filled: "Filled", closed: "Closed", rejected: "Needs changes" };
const applicationStatus = { pending_review: "Under safety review", applied: "Approved · sent to the poster", rejected: "Not approved", chosen: "Selected", guardian_approved: "Guardian approved", declined: "Not selected", withdrawn: "Withdrawn" };

function PosterJobCard({ job, chooseApplicant, closeJob, act }) {
  return <article className="booking-card" data-testid={`card-resident-job-${job.id}`}>
        <div className="booking-card-head"><div><p className="booking-business">{job.businessName ? `${job.businessName} · ${job.category}` : job.category}</p><h3>{job.title}</h3></div><span className={`status-pill job-status-${job.status}`}>{jobStatus[job.status] ?? job.status}</span></div>
        <p>{job.description}</p><p className="booking-timing"><strong>When</strong>{job.timing}<strong>Pay</strong>{job.payText}</p>
        {job.rejectionReason && <p className="rejection-note"><strong>Review note</strong>{job.rejectionReason}</p>}
        {(() => {
          const visibleApplications = job.applications.filter((app) => !["pending_review", "rejected", "withdrawn"].includes(app.status));
          return <div className="applicant-list"><h4>Applications <span className="phase-count">{visibleApplications.length}</span></h4>
          {visibleApplications.length ? visibleApplications.map((app) => <div className="applicant-row" key={app.id}><div><strong>{app.studentFirstName}, age {app.age}</strong><span className={`status-pill application-status-${app.status}`}>{applicationStatus[app.status] ?? app.status}</span><p>{app.message}</p><p className="phase-help">{app.availability ? `Available: ${app.availability}` : "Availability not given"} · {app.hasOtherJob ? `Other job: ${app.otherJobDetails}` : app.availability ? "No other job" : ""}</p></div>
            {job.status === "open" && app.status === "applied" && <button type="button" className="btn btn-teal btn-sm" disabled={chooseApplicant.isPending} onClick={() => act(chooseApplicant, { jobId: job.id, applicationId: app.id })}>{job.businessName ? "Accept student" : "Choose student"}</button>}
          </div>) : <p className="phase-help">No approved applications to review yet.</p>}
        </div>;
        })()}
        {(job.status === "open" || job.status === "pending_review") && <div className="booking-actions"><button type="button" className="btn btn-outline btn-sm" disabled={closeJob.isPending} onClick={() => act(closeJob, { jobId: job.id })}>{job.businessName ? "Close opening" : "Close job"}</button></div>}
      </article>;
}

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
      jobs.length ? <div className="booking-list">{jobs.map((job) => <PosterJobCard key={job.id} job={job} chooseApplicant={chooseApplicant} closeJob={closeJob} act={act} />)}</div> : <div className="phase-empty booking-empty"><p className="eyebrow">A good place to start</p><h3>Your job postings will live here.</h3><p>Post a clear description, timing, and pay so students know what to expect.</p><Link href="/residents#post-a-job" className="btn btn-teal">Post a job</Link></div>}
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
      applications.length ? <div className="booking-list">{applications.map((app) => <article className="booking-card" key={app.id}><div className="booking-card-head"><div><p className="booking-business">{app.businessName ? `${app.businessName} · ${app.category}` : app.category}</p><h3>{app.jobTitle}</h3></div><span className={`status-pill application-status-${app.status}`}>{applicationStatus[app.status] ?? app.status}</span></div><p>{app.message}</p>{app.status === "rejected" && app.rejectionReason && <p className="rejection-note"><strong>Review note</strong>{app.rejectionReason}</p>}<p className="phase-help">Applied {new Date(app.createdAt).toLocaleDateString()}</p>{["pending_review", "applied", "chosen"].includes(app.status) && <div className="booking-actions"><button type="button" className="btn btn-outline btn-sm" disabled={withdraw.isPending} onClick={() => cancel(app.id)}>Withdraw application</button></div>}</article>)}</div> :
        <div className="phase-empty booking-empty"><p className="eyebrow">Start with a nearby opportunity</p><h3>Your applications will show here.</h3><p>Choose a job that feels right and tell the resident why you're a good fit.</p><Link href="/explore?type=job" className="btn btn-teal">Browse jobs</Link></div>}
  </section>;
}

export function BusinessOpenings({ businesses }) {
  const queryClient = useQueryClient();
  const liveBusinesses = (businesses ?? []).filter((business) => business.status === "live");
  const query = useGetMyBusinessOpenings({ query: { queryKey: getGetMyBusinessOpeningsQueryKey(), refetchInterval: 30000 } });
  const createOpening = useCreateBusinessOpening();
  const chooseApplicant = useChooseJobApplicant();
  const closeJob = useCloseMyJob();
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetMyBusinessOpeningsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetPublicJobsQueryKey() }),
    ]);
  }
  async function act(fn, args) {
    setError("");
    try { await fn.mutateAsync(args); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "We couldn't update this opening."); }
  }
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    try {
      await createOpening.mutateAsync({ businessId: String(data.get("businessId")), data: {
        title: String(data.get("title")).trim(),
        category: String(data.get("category")),
        description: String(data.get("description")).trim(),
        timing: String(data.get("timing")).trim(),
        payText: String(data.get("payText")).trim(),
      } });
      await refresh();
      form.reset();
      setFormOpen(false);
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't post this opening."); }
  }
  const jobs = query.data?.jobs ?? [];
  if (!liveBusinesses.length && !jobs.length) return null;
  return <section className="booking-section" data-testid="section-business-openings"><div className="phase-section-title"><div><p className="eyebrow">Grow your business</p><h2>Openings and applicants</h2><p className="phase-help">Post a role at your business. Launch Lane reviews each opening and every application first, then approved applicants come to you. Their guardian approves before they join.</p></div>{liveBusinesses.length > 0 && !formOpen && <button type="button" className="btn btn-teal btn-sm" onClick={() => { setFormOpen(true); setSaved(false); }} data-testid="button-new-opening">Post an opening</button>}</div>
    {error && <p className="phase-error" role="alert">{error}</p>}
    {saved && <p className="phase-help" role="status" data-testid="text-opening-submitted">Opening submitted. It will show on Explore once Launch Lane approves it.</p>}
    {formOpen && <form className="form phase-form" onSubmit={submit} data-testid="form-new-opening">
      <fieldset className="fieldset"><legend>The role</legend>
        <label className="field"><span>Business</span><select className="select" name="businessId" required defaultValue={liveBusinesses[0]?.id}>{liveBusinesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
        <label className="field"><span>Role title</span><input className="input" name="title" required minLength="2" maxLength="120" placeholder="e.g. Weekend bin-cleaning helper" /></label>
        <label className="field"><span>Category</span><select className="select" name="category" required defaultValue={liveBusinesses[0]?.category ?? categories[0]}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="field"><span>What the role involves</span><textarea className="textarea" name="description" required minLength="10" maxLength="2000" placeholder="What the helper will do and any experience you'd like." /></label>
        <div className="row-2"><label className="field"><span>Schedule</span><input className="input" name="timing" required maxLength="300" placeholder="e.g. Saturdays 9am–noon" /></label><label className="field"><span>Pay</span><input className="input" name="payText" required maxLength="300" placeholder="e.g. $12 per hour" /></label></div>
      </fieldset>
      <div className="phase-actions"><button type="submit" className="btn btn-blue" disabled={createOpening.isPending}>{createOpening.isPending ? "Submitting…" : "Submit for review"}</button><button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>Cancel</button></div>
    </form>}
    {query.isLoading ? <JobLoading /> : query.isError ? <div className="phase-empty" role="alert"><p>We couldn't load your openings.</p><button type="button" className="text-button" onClick={() => query.refetch()}>Try again</button></div> :
      jobs.length ? <div className="booking-list">{jobs.map((job) => <PosterJobCard key={job.id} job={job} chooseApplicant={chooseApplicant} closeJob={closeJob} act={act} />)}</div> :
        !formOpen && <p className="phase-help">No openings yet. When your business needs a hand, post one here.</p>}
  </section>;
}
