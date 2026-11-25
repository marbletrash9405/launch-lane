import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  getGetChatThreadQueryKey, getGetChatThreadsQueryKey, getGetChatUnreadCountQueryKey,
  useGetChatThreads, useGetChatThread, useCreateChatMessage, useMarkChatThreadRead,
  useReportChatMessage,
} from "@workspace/api-client-react";

const SAFETY_NOTICE = "Messages may be reviewed by Launch Lane to keep everyone safe. Don't share passwords or payment details.";
const chatRoleLabel = { student: "Student", guardian: "Parent", resident: "Resident", admin: "Launch Lane" };
const PHONE_NUMBER_RE = /\b(?:\+?\d[\d\s().-]{7,}\d)\b/;

function ThreadList({ selectedId }) {
  const threadsQuery = useGetChatThreads({ query: { queryKey: getGetChatThreadsQueryKey(), refetchInterval: 4000 } });
  const threads = threadsQuery.data?.threads ?? [];
  return <aside className="chat-sidebar" aria-label="Conversations">
    <div className="chat-sidebar-head"><p className="eyebrow">Your conversations</p><h2>Messages</h2></div>
    {threadsQuery.isLoading ? <div className="chat-loading" aria-label="Loading conversations"><span /><span /><span /></div> :
      threadsQuery.isError ? <div className="chat-side-empty" role="alert"><p>We couldn't load your conversations.</p><button className="text-button" type="button" onClick={() => threadsQuery.refetch()}>Try again</button></div> :
        threads.length ? <nav className="chat-thread-list">{threads.map((thread) => <Link key={thread.id} href={`/messages/${thread.id}`} className={`chat-thread-item${selectedId === thread.id ? " selected" : ""}`} aria-current={selectedId === thread.id ? "page" : undefined}>
          <span className="chat-thread-mark" aria-hidden="true">{thread.sourceType === "booking" ? "B" : "J"}</span>
          <span className="chat-thread-copy"><strong>{thread.title}</strong><small>{thread.studentFirstName} · {thread.residentFirstName}</small><span>{thread.latestMessage || "Start the conversation"}</span></span>
          {thread.unreadCount > 0 && <span className="chat-unread" aria-label={`${thread.unreadCount} unread`}>{thread.unreadCount}</span>}
          {thread.locked && <span className="chat-locked-tag">Locked</span>}
        </Link>)}</nav> : <div className="chat-side-empty"><p className="eyebrow">No conversations yet</p><h3>Your chats will appear here.</h3><p>When a booking or job application is ready for a conversation, it will show up here.</p></div>}
  </aside>;
}

function ThreadConversation({ threadId }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState("");
  const [phoneNotice, setPhoneNotice] = useState(false);
  const [reporting, setReporting] = useState("");
  const threadQuery = useGetChatThread(threadId, { query: { enabled: Boolean(threadId), queryKey: getGetChatThreadQueryKey(threadId), refetchInterval: 4000 } });
  const sendMessage = useCreateChatMessage();
  const markRead = useMarkChatThreadRead();
  const reportMessage = useReportChatMessage();
  const thread = threadQuery.data?.thread;
  const messages = threadQuery.data?.messages ?? [];

  useEffect(() => {
    if (threadId && thread) markRead.mutate({ threadId });
  }, [threadId, thread?.unreadCount]);

  async function submit(event) {
    event.preventDefault();
    const clean = text.trim();
    if (!clean || !thread || thread.locked || sendMessage.isPending) return;
    setError("");
    if (PHONE_NUMBER_RE.test(clean) && phoneConfirmation !== clean) {
      setPhoneConfirmation(clean);
      return;
    }
    try {
      await sendMessage.mutateAsync({ threadId, data: { text: clean } });
      setPhoneNotice(PHONE_NUMBER_RE.test(clean));
      setText("");
      setPhoneConfirmation("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetChatThreadQueryKey(threadId) }),
        queryClient.invalidateQueries({ queryKey: getGetChatThreadsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetChatUnreadCountQueryKey() }),
      ]);
    } catch (sendError) { setError(sendError instanceof Error ? sendError.message : "Your message could not be sent."); }
  }

  async function report(messageId) {
    const reason = window.prompt("Tell Launch Lane why you are reporting this message (optional).");
    if (reason === null) return;
    setError("");
    try {
      await reportMessage.mutateAsync({ threadId, data: { messageId, ...(reason.trim() ? { reason: reason.trim().slice(0, 1000) } : {}) } });
      setReporting("Thanks. This message has been reported to Launch Lane.");
    } catch (reportError) { setError(reportError instanceof Error ? reportError.message : "We couldn't report this message."); }
  }

  if (!threadId) return <section className="chat-empty-main"><span className="chat-empty-mark" aria-hidden="true">LL</span><p className="eyebrow">A safer way to arrange work</p><h2>Choose a conversation.</h2><p>Keep the details in one place, with a parent or guardian included for student accounts.</p></section>;
  if (threadQuery.isLoading) return <section className="chat-conversation"><div className="chat-loading"><span /><span /><span /></div></section>;
  if (threadQuery.isError || !thread) return <section className="chat-error"><p role="alert">We couldn't open this conversation.</p><button className="text-button" onClick={() => threadQuery.refetch()} type="button">Try again</button><button className="text-button" onClick={() => setLocation("/messages")} type="button">Back to messages</button></section>;

  return <section className="chat-conversation" aria-label={`Conversation: ${thread.title}`}>
    <header className="chat-conversation-head"><div><p className="eyebrow">{thread.sourceType === "booking" ? "Booking conversation" : "Job application"}</p><h2>{thread.title}</h2><p>{thread.studentFirstName} · {thread.residentFirstName}</p></div><Link className="chat-back-mobile" href="/messages">All messages</Link></header>
    <p className="chat-safety-notice">{SAFETY_NOTICE}</p>
    <div className="chat-messages" aria-live="polite">{messages.length ? messages.map((message) => <article className={`chat-message${message.senderRole === "student" ? " chat-message-student" : ""}${message.deletedAt ? " chat-message-deleted" : ""}`} key={message.id}>
      <div className="chat-message-meta"><strong>{message.senderFirstName}</strong><span>{chatRoleLabel[message.senderRole] ?? "Launch Lane"}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></div>
      <p>{message.deletedAt ? "This message was removed by Launch Lane." : message.text}</p>
      {!message.deletedAt && <button type="button" className="chat-report" disabled={reportMessage.isPending} onClick={() => report(message.id)} aria-label={`Report message from ${message.senderFirstName}`}>Report</button>}
    </article>) : <div className="chat-first-message"><p className="eyebrow">Conversation started</p><h3>Make the next step clear.</h3><p>Share the work details, timing, and expectations here.</p></div>}</div>
    {reporting && <p className="chat-inline-success" role="status">{reporting}</p>}
    {phoneNotice && <p className="chat-phone-note" role="status">A quick reminder: keep phone numbers private. Your message was still sent.</p>}
    {error && <p className="phase-error" role="alert">{error}</p>}
    {thread.locked ? <div className="chat-locked-notice" role="status"><strong>This conversation is locked.</strong><span>New messages cannot be sent right now.</span></div> :
      <form className="chat-compose" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-message">Write a message</label>
        <textarea id="chat-message" className="textarea" value={text} maxLength={1000} onChange={(event) => { setText(event.target.value); setPhoneConfirmation(""); setPhoneNotice(false); }} placeholder="Write a clear, respectful message…" required />
        {phoneConfirmation && phoneConfirmation === text.trim() && <p className="chat-phone-note" role="status">This message may include a phone number. For safety, keep contact details private when possible. You can still send it.</p>}
        <div className="chat-compose-foot"><span>{text.length} / 1,000</span><button className="btn btn-teal" type="submit" disabled={!text.trim() || sendMessage.isPending}>{sendMessage.isPending ? "Sending…" : phoneConfirmation && phoneConfirmation === text.trim() ? "Send anyway" : "Send message"}</button></div>
      </form>}
  </section>;
}

export default function MessagesPage() {
  const { threadId } = useParams();
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <section className="messages-page"><div className="messages-wrap"><p className="chat-loading" role="status">Loading your messages…</p></div></section>;
  if (!isSignedIn) return <section className="messages-page"><div className="messages-wrap"><header className="messages-page-head"><div><p className="eyebrow">Launch Lane / Private conversations</p><h1>Messages</h1><p>Sign in to open your conversations.</p></div></header><div className="phase-panel"><Link className="btn btn-teal" href="/login">Log in</Link><Link className="btn btn-outline" href="/signup">Sign up</Link></div></div></section>;
  return <section className="messages-page"><div className="messages-wrap"><header className="messages-page-head"><div><p className="eyebrow">Launch Lane / Private conversations</p><h1>Messages</h1><p>Clear plans, with student safety built into the conversation.</p></div><Link href="/dashboard" className="btn btn-outline btn-sm">Dashboard</Link></header><div className="chat-shell"><ThreadList selectedId={threadId} /><ThreadConversation threadId={threadId} /></div></div></section>;
}
