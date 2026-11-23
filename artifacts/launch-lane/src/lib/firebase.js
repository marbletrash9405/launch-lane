"use client";

// Browser-only Firebase setup: Google sign-in (Firebase Authentication) and user profiles (Firestore).
// Each signed-in person gets a document at users/{uid} with their name, email and Student/Resident role.

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig, firebaseConfigured } from "./firebase-config";

export { firebaseConfigured };

function app() {
  return getApps()[0] || initializeApp(firebaseConfig);
}

export const auth = () => getAuth(app());
const db = () => getFirestore(app());

const ROLE_KEY = "ll_signup_role";

// Create or update users/{uid}. A role is only set when the person picked one on Sign up.
async function saveProfile(user, role) {
  try {
    const ref = doc(db(), "users", user.uid);
    const existing = await getDoc(ref);
    await setDoc(
      ref,
      {
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        lastLoginAt: serverTimestamp(),
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
        ...(role === "student" || role === "resident" ? { role } : {}),
      },
      { merge: true }
    );
  } catch (e) {
    // Sign-in still works if Firestore isn't set up yet.
    console.warn("Couldn't save profile to Firestore:", e?.code || e);
  }
}

/** Sign in with Google. `role` ("student" | "resident") is saved when signing up. */
export async function signInWithGoogle(role) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const { user } = await signInWithPopup(auth(), provider);
    await saveProfile(user, role);
    return user;
  } catch (e) {
    // Some phones and browsers block popups; fall back to a full-page redirect.
    if (e?.code === "auth/popup-blocked" || e?.code === "auth/operation-not-supported-in-this-environment") {
      try { sessionStorage.setItem(ROLE_KEY, role || ""); } catch {}
      await signInWithRedirect(auth(), provider);
      return null;
    }
    throw e;
  }
}

/** Finish a redirect sign-in (call once on the Log in / Sign up pages). */
export async function finishRedirectSignIn() {
  const result = await getRedirectResult(auth());
  if (!result?.user) return null;
  let role = "";
  try { role = sessionStorage.getItem(ROLE_KEY) || ""; sessionStorage.removeItem(ROLE_KEY); } catch {}
  await saveProfile(result.user, role);
  return result.user;
}

export function watchUser(callback) {
  return onAuthStateChanged(auth(), callback);
}

export function signOutUser() {
  return signOut(auth());
}

/** Friendly message for a Firebase sign-in error, or null if it should be ignored. */
export function signInErrorMessage(e) {
  switch (e?.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/unauthorized-domain":
      return "This web address isn't approved for sign-in yet. Add it under Firebase → Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in isn't turned on yet. Enable it in Firebase → Authentication → Sign-in method.";
    case "auth/network-request-failed":
      return "Couldn't connect. Check your internet and try again.";
    default:
      if (typeof window !== "undefined") console.warn("Firebase sign-in error:", e?.code || e);
      return "Sign-in didn't work. Please try again.";
  }
}
