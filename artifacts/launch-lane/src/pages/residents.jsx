import { Link } from "wouter";
import JobPostingPanel from "@/components/JobPostingPanel";
import Steps from "@/components/Steps";
import { hirerSteps } from "@/data/steps";
import { site } from "@/lib/site";

export const metadata = { title: "Residents – Post a job" };

export default function ResidentsPage() {
  return <>
    <section className="page-head"><div className="wrap"><p className="eyebrow">Residents – Post a job</p><h1>Find it close to home</h1><p>From lawn mowing and trash cleanup to social media help, discover what {site.community} students offer. Browse student services or post a job and let interested students apply.</p><div className="hero-actions"><Link href="/explore" className="btn btn-gold">Browse student services</Link><a href="#post-a-job" className="btn btn-ghost">Post a job</a></div></div></section>
    <section className="section"><div className="wrap"><p className="notice">You must live in {site.community} in {site.location}, to post a job or hire a student through {site.name}.</p></div><div className="wrap split" style={{ marginTop: 48 }}><div className="section-head"><p className="eyebrow">How hiring works</p><h2>Four steps to getting it done</h2></div><Steps steps={hirerSteps} /></div></section>
    <section className="section bg-cream" id="post-a-job"><div className="wrap"><div className="section-head"><p className="eyebrow">Post a job</p><h2>Tell students what you need</h2></div><div className="form-wrap"><div className="form-card"><JobPostingPanel /></div><aside className="aside"><h3>Good to know</h3><ul className="check-list"><li>Every application comes to us first, then we connect you with the student.</li><li>A guardian signs off before a student accepts your job.</li><li>You pay the student directly. {site.name} takes no cut.</li></ul><p className="note"><Link href="/how-it-works#before-you-agree">Before you agree to a job</Link></p></aside></div></div></section>
  </>;
}
