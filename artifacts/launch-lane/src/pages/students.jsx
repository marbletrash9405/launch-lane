import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import Steps from "@/components/Steps";
import { studentSteps } from "@/data/steps";
import { site } from "@/lib/site";

export const metadata = { title: "Students – Apply" };

function StudentStart() {
  const { isLoaded, isSignedIn } = useAuth();
  const [account, setAccount] = useState(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    setLoading(true);
    fetch("/api/auth/me", { credentials: "include" }).then(async (response) => {
      const data = await response.json();
      if (response.status === 404) return { missing: true };
      if (!response.ok) throw new Error(data?.error || "We couldn't check your account.");
      return { account: data };
    }).then((result) => {
      if (active) { setMissing(Boolean(result.missing)); setAccount(result.account ?? null); }
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "We couldn't check your account."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn]);
  if (!isLoaded) return <div className="phase-panel skeleton-panel" role="status"><span /><span /><span /></div>;
  if (isSignedIn && (loading || (!account && !missing && !error))) return <div className="phase-panel skeleton-panel" role="status"><span /><span /><span /></div>;
  if (!isSignedIn) return <div className="phase-panel job-access"><h3>Ready to get started?</h3><p>Sign up as a student to build your profile, share your services, and apply for neighborhood jobs.</p><div className="phase-actions"><Link href="/signup?role=student" className="btn btn-teal">Sign up as a student</Link><Link href="/login" className="btn btn-outline">Log in</Link></div></div>;
  if (error) return <div className="phase-panel"><p className="phase-error" role="alert">{error}</p><button type="button" className="text-button" onClick={() => window.location.reload()}>Try again</button></div>;
  if (missing) return <div className="phase-panel job-access"><h3>Set up your student account.</h3><p>Choose Student during sign-up to offer services and apply for jobs.</p><Link href="/signup?role=student" className="btn btn-teal">Sign up as a student</Link></div>;
  if (account?.role !== "student") return <div className="phase-panel job-access"><h3>Use a student account to offer services.</h3><p>Your current Launch Lane account is set up for a different role.</p><Link href="/dashboard" className="btn btn-teal">Open your dashboard</Link></div>;
  if (!account.profileComplete) return <div className="phase-panel job-access"><h3>Finish setting up your profile.</h3><p>Complete your student profile before offering services or applying for jobs.</p><Link href="/complete-profile" className="btn btn-teal">Complete profile</Link></div>;
  return <div className="phase-panel job-access"><p className="eyebrow">Student workspace</p><h3>Good to have you here, {account.firstName || account.name || "neighbor"}.</h3><p>Manage your services and see where your job applications stand.</p><Link href="/dashboard" className="btn btn-teal">Open your dashboard</Link></div>;
}

export default function StudentsPage() {
  return <>
    <section className="page-head"><div className="wrap"><p className="eyebrow">Students – Apply</p><h1>Put your skills to work close to home.</h1><p>Mow lawns, help with trash cleanup, or sell your handmade jewelry. If you&apos;re 18 or under and live in {site.community}, you can list your services, promote your business, and apply for jobs your neighbors post.</p><div className="hero-actions"><a href="#apply" className="btn btn-gold">Offer a service</a><Link href="/explore?type=job" className="btn btn-ghost">Browse jobs</Link></div></div></section>
    <section className="section"><div className="wrap split"><div className="section-head"><p className="eyebrow">Offer a service</p><h2>From application to first job</h2><p>Your guardian signs off before your listing goes live, and before you take any job a neighbor posts.</p></div><Steps steps={studentSteps} accent="gold" /></div></section>
    <section className="section bg-cream" id="apply"><div className="wrap"><div className="section-head"><p className="eyebrow">Apply</p><h2>Tell us what you offer</h2><p>Start with your Launch Lane student account. Your guardian stays part of each approval.</p></div><StudentStart /><aside className="aside job-safety"><h3>Before you start a job</h3><ul className="check-list"><li>Agree on the work and payment details</li><li>Discuss safety</li><li>Check any insurance requirements</li></ul><p className="note">You keep 100% of what you earn. <Link href="/how-it-works#before-you-agree">Read more</Link></p></aside></div></section>
  </>;
}
