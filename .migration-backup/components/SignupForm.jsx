"use client";

import { useState } from "react";
import GoogleSignIn from "./GoogleSignIn";

export default function SignupForm({ community }) {
  const [role, setRole] = useState("student");

  return (
    <div className="form" style={{ gap: 18 }}>
      <fieldset className="role-picker">
        <legend>I am a…</legend>
        <label className="role-option">
          <input type="radio" name="role-choice" value="student" checked={role === "student"} onChange={() => setRole("student")} />
          <span>
            <strong>Student</strong>
            <span>18 or under, living in {community}. Your guardian approves your listing.</span>
          </span>
        </label>
        <label className="role-option">
          <input type="radio" name="role-choice" value="resident" checked={role === "resident"} onChange={() => setRole("resident")} />
          <span>
            <strong>Resident</strong>
            <span>Living in {community} and looking to hire a student.</span>
          </span>
        </label>
      </fieldset>
      <GoogleSignIn label="Sign up with Google" role={role} />
    </div>
  );
}
