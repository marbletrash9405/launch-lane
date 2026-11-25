import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGuardianApprovalQueryKey, useGetGuardianApproval,
  useSubmitGuardianApproval,
} from "@workspace/api-client-react";

export default function GuardianApprovalPage() {
  const params = useParams();
  const token = params.token ?? "";
  const [submitted, setSubmitted] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const approval = useGetGuardianApproval(token, {
    query: { enabled: Boolean(token), queryKey: getGetGuardianApprovalQueryKey(token) },
  });
  const submitApproval = useSubmitGuardianApproval();
  const record = approval.data;
  const unavailable = !record || record.expired || record.used || Boolean(record.decision);

  async function decide(decision) {
    setError("");
    try {
      const result = await submitApproval.mutateAsync({ token, data: { decision } });
      setSubmitted(result.decision);
      await queryClient.invalidateQueries({ queryKey: getGetGuardianApprovalQueryKey(token) });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't record your response. Please try again.");
    }
  }

  return (
    <section className="guardian-page">
      <div className="guardian-shell">
        <Link href="/" className="guardian-wordmark" data-testid="link-guardian-home">LAUNCH LANE <span>MERCER CROSSING</span></Link>
        <div className="guardian-card">
          <div className="guardian-symbol" aria-hidden="true">LL</div>
          <p className="eyebrow">Guardian review</p>
          {approval.isLoading ? <div className="guardian-skeleton" data-testid="loading-guardian-approval"><span /><span /><span /></div> :
            approval.isError || !record ? <div className="guardian-message" data-testid="error-guardian-approval"><h1>We can&apos;t open this approval.</h1><p>This link may be invalid. Please contact Launch Lane if you need another one.</p></div> :
              <>
                <h1 data-testid="text-guardian-business">{record.targetType === "job_application" ? record.jobTitle : record.businessName}</h1>
                <div className="guardian-summary"><span>{record.category}</span><span>{record.targetType === "job_application" ? `Applying to ${record.residentFirstName || "a Mercer Crossing neighbor"}` : "Student service"}</span><span>Offered by {record.studentName}</span></div>
                {submitted ? <div className="guardian-result" role="status" data-testid="success-guardian-decision"><h2>{submitted === "approved" ? "Approval recorded." : "Response recorded."}</h2><p>{submitted === "approved" ? record.targetType === "job_application" ? "Thank you. Your approval has been recorded and shared with the Launch Lane team." : "Thank you. Your student’s business is now live on Launch Lane." : "Thank you. The Launch Lane team has been notified of your decision."}</p></div> :
                  unavailable ? <div className="guardian-result" data-testid="state-guardian-link-unavailable"><h2>{record.expired ? "This link has expired." : record.decision ? "A response is already recorded." : "This link has already been used."}</h2><p>{record.decision ? `Decision recorded: ${record.decision}.` : "Please contact Launch Lane if you need help with this approval."}</p></div> :
                    <><div className="guardian-copy"><h2>{record.targetType === "job_application" ? "Do you approve this job application?" : "Is this service okay to list?"}</h2><p>{record.targetType === "job_application" ? `Please review ${record.studentName}'s application for ${record.jobTitle}. Your response will be shared with the Launch Lane team.` : `Please review the listing request from ${record.studentName}. Your response will be shared with the Launch Lane team.`}</p></div>
                      {error && <p className="phase-error" role="alert" data-testid="error-guardian-submit">{error}</p>}
                       <div className="guardian-actions"><button type="button" className="btn btn-teal" disabled={submitApproval.isPending} onClick={() => decide("approved")} data-testid="button-guardian-approve">{submitApproval.isPending ? "Recording…" : record.targetType === "job_application" ? "I approve this application" : "I approve this listing"}</button><button type="button" className="btn btn-outline" disabled={submitApproval.isPending} onClick={() => decide("declined")} data-testid="button-guardian-decline">I do not approve</button></div>
                    </>}
              </>}
        </div>
        <p className="guardian-footnote">Launch Lane keeps Mercer Crossing students and neighbors connected with guardians in the loop.</p>
      </div>
    </section>
  );
}
