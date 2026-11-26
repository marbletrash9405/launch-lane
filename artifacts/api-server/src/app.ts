import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { createRateLimiter } from "./lib/rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

// The Vercel Clerk integration names the publishable key
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; @clerk/express reads CLERK_PUBLISHABLE_KEY.
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const guardianApprovalLimiter = createRateLimiter({
  name: "guardian-link",
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many attempts. Please wait a few minutes and try again.",
});
app.use("/api/guardian/approvals", guardianApprovalLimiter);

// Reads CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY from the environment.
app.use(
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

app.use("/api", router);

export default app;
