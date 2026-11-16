// Google sign-in via Auth.js (authjs.dev).
//
// Turn it on by adding these in Vercel → Project → Settings → Environment Variables, then redeploy:
//   AUTH_SECRET         a long random string (run `npx auth secret`, or any 32+ random characters)
//   AUTH_GOOGLE_ID      OAuth client ID from Google Cloud Console
//   AUTH_GOOGLE_SECRET  OAuth client secret from Google Cloud Console
// Until all three are set, the site still works and the Google buttons say sign-in is coming soon.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

export const authConfigured = Boolean(
  process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  trustHost: true,
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // On sign-in, remember whether they signed up as a student or resident.
    // (No database yet, so this lives in the sign-in session only.)
    async jwt({ token, trigger }) {
      if (trigger === "signIn") {
        try {
          const role = (await cookies()).get("ll_role")?.value;
          if (role === "student" || role === "resident") token.role = role;
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role ?? null;
      return session;
    },
  },
});
