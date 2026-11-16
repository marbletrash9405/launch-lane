import { handlers, authConfigured } from "@/auth";

export const dynamic = "force-dynamic";

// When Google sign-in isn't set up yet, answer "no session" instead of erroring.
const notConfigured = () => Response.json(null);

export const GET = authConfigured ? handlers.GET : notConfigured;
export const POST = authConfigured ? handlers.POST : notConfigured;
