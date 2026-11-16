"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, signIn, signOut } from "@/auth";

export async function googleSignIn(formData) {
  if (!authConfigured) redirect("/login?error=not_configured");

  const role = formData.get("role");
  if (role === "student" || role === "resident") {
    (await cookies()).set("ll_role", role, {
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  const next = String(formData.get("redirectTo") || "/");
  await signIn("google", { redirectTo: next.startsWith("/") && !next.startsWith("//") ? next : "/" });
}

export async function signOutAction() {
  if (!authConfigured) redirect("/");
  await signOut({ redirectTo: "/" });
}
