import { useAuth } from "@clerk/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyBusinessesQueryKey, getGetPublicBusinessesQueryKey,
  useGetMyBusinesses, useCreateBusiness, useUpdateBusiness, useSetBusinessPause,
  useRequestBusinessPhotoUpload,
  getGetGuardianDashboardQueryKey, useGetGuardianDashboard,
} from "@workspace/api-client-react";
import { categories } from "@/data/categories";
import { IncomingBookings, ResidentBookings } from "@/components/BookingPanels";
import { ResidentJobs, StudentJobApplications, BusinessOpenings } from "@/components/JobDashboardPanels";

const blankBusiness = { name: "", category: categories[0], description: "", pricingText: "", photoPaths: [] };
const labels = {
  pending_review: "In review", pending_guardian: "Guardian approval", live: "Live",
  paused: "Paused", rejected: "Needs changes",
};

async function makeWebp(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare this image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  while (true) {
    for (let quality = 0.86; quality >= 0.22; quality -= 0.08) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= 215040) { bitmap.close(); return blob; }
    }
    if (canvas.width <= 320) break;
    const nextWidth = Math.max(320, Math.round(canvas.width * 0.82));
    const nextHeight = Math.max(1, Math.round(canvas.height * nextWidth / canvas.width));
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }
  bitmap.close();
  throw new Error("This image could not be compressed below 210 KiB. Try a smaller image.");
}

function BusinessEditor({ existing, onClose, onSaved }) {
  const [form, setForm] = useState(() => existing ? {
    name: existing.name, category: existing.category, description: existing.description,
    pricingText: existing.pricingText, photoPaths: [...existing.photoPaths],
  } : { ...blankBusiness });
  const [previews, setPreviews] = useState(() => (existing?.photoUrls ?? []).map((url, index) => ({
    url, path: existing.photoPaths[index], existing: true,
  })));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness();
  const requestUpload = useRequestBusinessPhotoUpload();
  const busy = uploading || createBusiness.isPending || updateBusiness.isPending;

  async function addPhotos(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (previews.length + files.length > 3) {
      setError("Choose up to three photos."); return;
    }
    setError("");
    setUploading(true);
    try {
      const added = [];
      for (const file of files) {
        const blob = await makeWebp(file);
        const result = await requestUpload.mutateAsync({
          data: { name: file.name.replace(/\.[^.]+$/, "") + ".webp", size: blob.size, contentType: "image/webp" },
        });
        const response = await fetch(result.uploadURL, {
          method: "PUT", headers: { "Content-Type": "image/webp" }, body: blob,
        });
        if (!response.ok) throw new Error("The photo upload did not finish. Please try again.");
        added.push({ url: URL.createObjectURL(blob), path: result.objectPath, existing: false });
      }
      setPreviews((current) => [...current, ...added]);
      setForm((current) => ({ ...current, photoPaths: [...current.photoPaths, ...added.map((photo) => photo.path)] }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "We couldn't upload that photo.");
    } finally { setUploading(false); }
  }

  function removePhoto(index) {
    const removed = previews[index];
    if (!removed.existing) URL.revokeObjectURL(removed.url);
    setPreviews((current) => current.filter((_, i) => i !== index));
    setForm((current) => ({ ...current, photoPaths: current.photoPaths.filter((path) => path !== removed.path) }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (existing) await updateBusiness.mutateAsync({ businessId: existing.id, data: form });
      else await createBusiness.mutateAsync({ data: form });
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save this business.");
    }
  }

  return (
    <section className="phase-panel editor-panel" aria-labelledby="business-editor-title" data-testid="panel-business-editor">
      <div className="phase-panel-head">
        <div><p className="eyebrow">Your service</p><h2 id="business-editor-title">{existing ? "Edit your business" : "Add a business"}</h2></div>
        <button type="button" className="phase-icon-button" onClick={onClose} aria-label="Close editor" data-testid="button-close-business-editor">Close</button>
      </div>
      <form className="phase-form" onSubmit={submit} data-testid="form-business">
        <label className="field"><span>Business name</span><input className="input" required minLength="2" maxLength="120" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-business-name" /></label>
        <label className="field"><span>Category</span><select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="select-business-category">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="field"><span>What do you offer?</span><textarea className="textarea" required minLength="10" maxLength="2000" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-business-description" /></label>
        <label className="field"><span>Pricing</span><input className="input" required minLength="1" maxLength="300" placeholder="For example, $15 per visit" value={form.pricingText} onChange={(e) => setForm({ ...form, pricingText: e.target.value })} data-testid="input-business-pricing" /></label>
        <div className="field">
          <span>Photos <small className="optional">({previews.length}/3, optional)</small></span>
          <p className="phase-help">JPEG, PNG, or WebP. Images are resized and compressed before upload.</p>
          <div className="photo-strip">{previews.map((photo, index) => <div className="photo-thumb" key={`${photo.path}-${index}`} data-testid={`photo-preview-${index}`}><img src={photo.url} alt={`Business photo ${index + 1}`} /><button type="button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`} data-testid={`button-remove-photo-${index}`}>Remove</button></div>)}</div>
          {previews.length < 3 && <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={addPhotos} data-testid="input-business-photos" />}
        </div>
        {error && <p className="phase-error" role="alert" data-testid="error-business-form">{error}</p>}
        <div className="phase-actions"><button type="submit" className="btn btn-teal" disabled={busy} data-testid="button-save-business">{busy ? "Saving…" : existing ? "Save changes" : "Submit for review"}</button><button type="button" className="btn btn-outline" onClick={onClose} disabled={busy} data-testid="button-cancel-business">Cancel</button></div>
      </form>
    </section>
  );
}

function StatusPill({ status }) {
  return <span className={`status-pill status-${status}`} data-testid={`status-business-${status}`}>{labels[status] ?? status}</span>;
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(undefined);
  const queryClient = useQueryClient();
  const myBusinessesQuery = useGetMyBusinesses({
    query: { queryKey: getGetMyBusinessesQueryKey(), enabled: account?.role === "student" },
  });
  const pauseBusiness = useSetBusinessPause();
  const guardianDashboard = useGetGuardianDashboard({
    query: { queryKey: getGetGuardianDashboardQueryKey(), enabled: account?.role === "guardian" },
  });
  const [actionError, setActionError] = useState("");
  const businesses = myBusinessesQuery.data?.businesses ?? [];
  const sortedBusinesses = useMemo(() => businesses, [businesses]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLocation("/login"); return; }
    let active = true;
    fetch("/api/auth/me", { credentials: "include" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404) { setLocation("/signup"); return null; }
        throw new Error(data?.error || "We couldn't load your Launch Lane account.");
      }
      return data;
    }).then((data) => {
      if (!active || !data) return;
      if (!data.profileComplete) { setLocation("/complete-profile"); return; }
      setAccount(data);
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "We couldn't load your account."); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, setLocation]);

  async function setPaused(business) {
    setActionError("");
    try {
      await pauseBusiness.mutateAsync({ businessId: business.id, data: { paused: business.status !== "paused" } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetMyBusinessesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetPublicBusinessesQueryKey() }),
      ]);
    } catch (pauseError) { setActionError(pauseError instanceof Error ? pauseError.message : "We couldn't update this listing."); }
  }

  async function refreshAfterSave() {
    setEditor(undefined);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetMyBusinessesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetPublicBusinessesQueryKey() }),
    ]);
  }

  return (
    <section className="phase-dashboard">
      <div className="phase-wrap">
        <header className="phase-intro"><div><p className="eyebrow">Launch Lane / Dashboard</p><h1>{account?.role === "resident" ? "Your neighborhood dashboard" : account?.role === "admin" ? "Launch Lane administration" : account?.role === "guardian" ? "Your family dashboard" : "Your corner of Mercer Crossing"}</h1><p>{account?.role === "resident" ? "Keep track of the services you have booked and the jobs you have posted." : account?.role === "admin" ? "Review businesses and jobs, and check email delivery during testing." : account?.role === "guardian" ? "Stay close to your student's services, work requests, and conversations." : "Keep your service details current. Your guardian stays in the loop at every step."}</p></div><div className="phase-mark">LL<span>{account?.role === "resident" ? "NEIGHBOR SPACE" : account?.role === "admin" ? "ADMIN WORKSPACE" : account?.role === "guardian" ? "FAMILY SPACE" : "STUDENT SPACE"}</span></div></header>
        {error && <div className="phase-error" role="alert" data-testid="error-account">{error}</div>}
        {!isLoaded || (!account && !error) ? <div className="phase-panel skeleton-panel" data-testid="loading-account"><span /><span /><span /></div> : account && (
          account.role === "student" ? (
            <>
              <div className="phase-welcome"><div><p className="eyebrow">Student workspace</p><h2>Hi, {account.firstName || account.name || "there"}.</h2><p>Make something good happen close to home.</p></div><button type="button" className="btn btn-teal" onClick={() => setEditor(null)} data-testid="button-add-business">Add a business <span aria-hidden="true">+</span></button></div>
              {actionError && <p className="phase-error" role="alert" data-testid="error-business-action">{actionError}</p>}
              {editor !== undefined && <BusinessEditor key={editor?.id ?? "new"} existing={editor} onClose={() => setEditor(undefined)} onSaved={refreshAfterSave} />}
              <div className="phase-section-title"><div><p className="eyebrow">Your services</p><h2>Business listings</h2></div><span className="phase-count" data-testid="count-my-businesses">{businesses.length} {businesses.length === 1 ? "listing" : "listings"}</span></div>
              <IncomingBookings account={account} />
              <BusinessOpenings businesses={businesses} />
              <StudentJobApplications />
              {myBusinessesQuery.isLoading ? <div className="phase-panel skeleton-panel" data-testid="loading-my-businesses"><span /><span /><span /></div> :
                myBusinessesQuery.isError ? <div className="phase-empty" role="alert" data-testid="error-my-businesses"><p>We couldn&apos;t load your businesses.</p><button className="text-button" type="button" onClick={() => myBusinessesQuery.refetch()} data-testid="button-retry-my-businesses">Try again</button></div> :
                  sortedBusinesses.length ? <div className="phase-business-list">{sortedBusinesses.map((business) => <article className="phase-business" key={business.id} data-testid={`card-my-business-${business.id}`}>
                    <div className="phase-business-photo">{business.photoUrls?.[0] ? <img src={business.photoUrls[0]} alt="" /> : <span>{business.category.slice(0, 1)}</span>}</div>
                    <div className="phase-business-copy"><div className="business-title-line"><h3 data-testid={`text-business-name-${business.id}`}>{business.name}</h3><StatusPill status={business.status} /></div><p className="business-category">{business.category} <span>·</span> {business.pricingText}</p><p>{business.description}</p>
                      {business.status === "rejected" && business.rejectionReason && <div className="rejection-note" data-testid={`text-rejection-reason-${business.id}`}><strong>Review note</strong>{business.rejectionReason}</div>}
                       <div className="phase-business-actions"><button type="button" className="text-button" onClick={() => setEditor(business)} data-testid={`button-edit-business-${business.id}`}>Edit details</button>{business.status === "live" && <button type="button" className="text-button" disabled={pauseBusiness.isPending} onClick={() => setPaused(business)} data-testid={`button-toggle-pause-${business.id}`}>Pause listing</button>}{business.status === "paused" && business.pausedBy === "student" && <button type="button" className="text-button" disabled={pauseBusiness.isPending} onClick={() => setPaused(business)} data-testid={`button-toggle-pause-${business.id}`}>Resume listing</button>}{business.status === "paused" && business.pausedBy === "admin" && <span className="business-category" data-testid={`text-admin-paused-business-${business.id}`}>Paused by Launch Lane</span>}</div>
                    </div>
                  </article>)}</div> :
                    <div className="phase-empty" data-testid="empty-my-businesses"><div className="empty-stamp">01</div><p className="eyebrow">A good place to start</p><h2>Your first service starts here.</h2><p>Add a clear description and fair pricing. We&apos;ll guide you and your guardian through the review.</p><button type="button" className="btn btn-teal" onClick={() => setEditor(null)} data-testid="button-create-first-business">Create your first listing</button></div>}
            </>
          ) : account.role === "admin" ? (
            <div className="phase-panel role-panel" data-testid="admin-dashboard-placeholder"><p className="eyebrow">Administrator</p><h2>Review tools are ready.</h2><p>Open the admin workspace to review student services and check testing email delivery.</p><Link href="/admin" className="btn btn-teal" data-testid="link-admin-workspace">Open admin workspace</Link></div>
          ) : account.role === "guardian" ? (
            <section className="guardian-dashboard" aria-label="Linked student activity">
              <div className="phase-welcome"><div><p className="eyebrow">Parent / Guardian workspace</p><h2>Linked student activity</h2><p>Business details are read-only here. Open a conversation to follow up with the group.</p></div><Link className="btn btn-teal" href="/messages">Open messages</Link></div>
              {guardianDashboard.isLoading ? <div className="phase-panel skeleton-panel" aria-label="Loading linked student activity"><span /><span /><span /></div> :
                guardianDashboard.isError ? <div className="phase-empty" role="alert"><p>We couldn't load linked student activity.</p><button className="text-button" type="button" onClick={() => guardianDashboard.refetch()}>Try again</button></div> :
                  guardianDashboard.data?.students?.length ? guardianDashboard.data.students.map((student) => <article className="phase-panel guardian-student" key={student.studentId}>
                    <header className="guardian-student-head"><div><p className="eyebrow">Student account · age {student.age}</p><h2>{student.firstName}</h2></div><span className="phase-count">{student.businesses.length} {student.businesses.length === 1 ? "service" : "services"}</span></header>
                    <section className="guardian-subsection"><div className="phase-section-title"><div><p className="eyebrow">Read-only details</p><h3>Services</h3></div></div>
                      {student.businesses.length ? <div className="guardian-business-grid">{student.businesses.map((business) => <article className="guardian-business" key={business.id}>{business.photoUrls?.[0] && <img src={business.photoUrls[0]} alt="" loading="lazy" />}<div className="business-title-line"><h4>{business.name}</h4><StatusPill status={business.status} /></div><p className="business-category">{business.category} · {business.pricingText}</p><p>{business.description}</p></article>)}</div> : <p className="phase-help">No business listings yet.</p>}
                    </section>
                    <section className="guardian-subsection"><div className="phase-section-title"><div><p className="eyebrow">Work activity</p><h3>Bookings & applications</h3></div></div>
                      <div className="guardian-activity-grid"><div><h4>Bookings</h4>{student.bookings.length ? student.bookings.map((booking) => <div className="guardian-activity" key={booking.id}><span>{booking.businessName}</span><span className={`status-pill booking-status-${booking.status}`}>{booking.status.replaceAll("_", " ")}</span></div>) : <p className="phase-help">No bookings yet.</p>}</div><div><h4>Job applications</h4>{student.jobApplications.length ? student.jobApplications.map((application) => <div className="guardian-activity" key={application.id}><span>{application.jobTitle}</span><span className={`status-pill application-status-${application.status}`}>{application.status.replaceAll("_", " ")}</span></div>) : <p className="phase-help">No applications yet.</p>}</div></div>
                    </section>
                    <section className="guardian-subsection"><div className="phase-section-title"><div><p className="eyebrow">Stay in the loop</p><h3>Group chats</h3></div></div>
                      {student.chats.length ? <div className="guardian-chat-list">{student.chats.map((chat) => <Link className="guardian-chat-link" key={chat.id} href={`/messages/${chat.id}`}><span><strong>{chat.title}</strong><small>{chat.latestMessage || "No messages yet"}</small></span><span className="status-pill">{chat.locked ? "Locked" : chat.unreadCount ? `${chat.unreadCount} unread` : "Open chat"}</span></Link>)}</div> : <p className="phase-help">No group chats yet.</p>}
                    </section>
                  </article>) : <div className="phase-empty"><p className="eyebrow">Family workspace</p><h2>No linked students yet.</h2><p>Once your guardian account is connected to a student account, their activity will appear here.</p></div>}
            </section>
          ) : (
            <>
              <div className="phase-welcome resident-welcome"><div><p className="eyebrow">Neighbor workspace</p><h2>Hi, {account.firstName || account.name || "there"}.</h2><p>Keep track of the services you&apos;ve booked nearby.</p></div><Link href="/explore" className="btn btn-teal" data-testid="link-explore-services">Explore services</Link></div>
              <ResidentBookings account={account} />
              <ResidentJobs />
            </>
          )
        )}
      </div>
    </section>
  );
}
