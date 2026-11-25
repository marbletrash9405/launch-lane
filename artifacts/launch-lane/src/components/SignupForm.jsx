"use client";

import { useState } from "react";
import { Link } from "wouter";
import GoogleSignIn from "./GoogleSignIn";

export default function SignupForm({ community }) {
  const [role, setRole] = useState(() => ["resident", "guardian"].includes(new URLSearchParams(window.location.search).get("role")) ? new URLSearchParams(window.location.search).get("role") : "student");

  return (
    <div className="form" style={{ gap: 18 }}>
      <fieldset className="role-picker">
        <legend>I am a…</legend>
        <label className="role-option">
          <input type="radio" name="role-choice" value="student" checked={role === "student"} onChange={() => setRole("student")} />
          <span>
            <strong>Student</strong>
            <span>13 to 18, living in {community}. Your guardian approves your listing.</span>
          </span>
        </label>
        <label className="role-option">
          <input type="radio" name="role-choice" value="resident" checked={role === "resident"} onChange={() => setRole("resident")} />
          <span>
            <strong>Resident</strong>
            <span>Living in {community} and looking to hire a student.</span>
          </span>
        </label>
        <label className="role-option">
          <input type="radio" name="role-choice" value="guardian" checked={role === "guardian"} onChange={() => setRole("guardian")} />
          <span>
            <strong>Parent / Guardian</strong>
            <span>Stay involved in your student’s Launch Lane activity.</span>
          </span>
        </label>
      </fieldset>
      <GoogleSignIn label="Sign up with Google" role={role} />
      <p className="login-note signup-legal">By signing up, you agree to our <Link href="/terms">Terms</Link> and acknowledge our <Link href="/privacy">Privacy Policy</Link>.</p>
    </div>
  );
}
