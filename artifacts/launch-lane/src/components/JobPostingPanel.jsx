import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyJobsQueryKey, getGetPublicJobsQueryKey, useCreateJob } from "@workspace/api-client-react";
import { categories } from "@/data/categories";

export default function JobPostingPanel() {
  const { isLoaded, isSignedIn } = useAuth();
  const [account, setAccount] = useState(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const createJob = useCreateJob();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    setLoading(true);
    fetch("/api/auth/me", { credentials: "include" }).then(async (response) => {
      const data = await response.json();
      if (response.status === 404) return { missing: true };
      if (!response.ok) throw new Error(data?.error || "We couldn't check your Launch Lane account.");
      return { account: data };
    }).then((result) => {
      if (!active) return;
      setMissing(Boolean(result.missing));
      setAccount(result.account ?? null);
    }).catch((error) => { if (active) setAccountError(error instanceof Error ? error.message : "We couldn't check your account."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn]);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setFormError("");
    try {
      await createJob.mutateAsync({ data: {
        title: String(data.get("title")).trim(),
        category: String(data.get("category")),
        description: String(data.get("description")).trim(),
        timing: String(data.get("timing")).trim(),
        payText: String(data.get("payText")).trim(),
      } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetMyJobsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetPublicJobsQueryKey() }),
      ]);
      setSaved(true);
      form.reset();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn't submit this job. Please try again.");
    }
  }

  if (!isLoaded || loading) return <div className="phase-panel skeleton-panel" role="status"><span /><span /><span /></div>;
  if (isSignedIn && !account && !missing && !accountError) return <div className="phase-panel skeleton-panel" role="status"><span /><span /><span /></div>;
  if (!isSignedIn) return <div className="phase-panel job-access"><h3>Sign in to post a neighborhood job.</h3><p>Use a resident account to share the work and pay details with Mercer Crossing students.</p><div className="phase-actions"><Link className="btn btn-teal" href="/login">Log in</Link><Link className="btn btn-outline" href="/signup?role=resident">Sign up as a resident</Link></div></div>;
  if (accountError) return <div className="phase-panel"><p className="phase-error" role="alert">{accountError}</p><button type="button" className="text-button" onClick={() => window.location.reload()}>Try again</button></div>;
  if (missing) return <div className="phase-panel job-access"><h3>Set up your resident account first.</h3><p>Choose Resident during sign-up, then return here to post your job.</p><Link className="btn btn-teal" href="/signup?role=resident">Sign up as a resident</Link></div>;
  if (account && account.role !== "resident") return <div className="phase-panel job-access"><h3>Resident account required.</h3><p>Only residents can post neighborhood jobs.</p></div>;
  if (account && !account.profileComplete) return <div className="phase-panel job-access"><h3>Complete your resident profile.</h3><p>Your profile confirms you live in the community before you post.</p><Link className="btn btn-teal" href="/complete-profile">Complete profile</Link></div>;
  if (saved) return <div className="success" role="status"><h2>Job submitted</h2><p>Your job is in review. Once approved, it will appear on Explore for students to apply.</p><div className="phase-actions"><Link className="btn btn-teal" href="/dashboard">View your dashboard</Link><button type="button" className="btn btn-outline" onClick={() => setSaved(false)}>Post another job</button></div></div>;
  return <form className="form phase-form" onSubmit={submit}>
    <fieldset className="fieldset"><legend>The job</legend>
      <label className="field"><span>Job title</span><input className="input" name="title" required minLength="2" maxLength="120" placeholder="e.g. Weekly Lawn Mowing" /></label>
      <label className="field"><span>Category</span><select className="select" name="category" required defaultValue={categories[0]}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="field"><span>Short description</span><textarea className="textarea" name="description" required minLength="10" maxLength="2000" placeholder="What needs doing, and roughly how big the job is." /></label>
      <div className="row-2"><label className="field"><span>Preferred timing</span><input className="input" name="timing" required maxLength="300" placeholder="e.g. Saturday mornings" /></label><label className="field"><span>What you're offering to pay</span><input className="input" name="payText" required maxLength="300" placeholder="e.g. $25 per visit" /></label></div>
    </fieldset>
    {formError && <p className="form-error" role="alert">{formError}</p>}
    <button type="submit" className="btn btn-blue" disabled={createJob.isPending}>{createJob.isPending ? "Submitting…" : "Post job"}</button>
  </form>;
}
