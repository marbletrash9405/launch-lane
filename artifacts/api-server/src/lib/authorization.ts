import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import {
  and,
  db,
  eq,
  ne,
  studentProfilesTable,
  usersTable,
  type User,
} from "@workspace/db";

export type Identity = {
  authId: string;
  email: string;
  firstName: string;
  name: string;
};

export type AccountContext = {
  identity: Identity;
  user: User;
};

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
}

export function getIdentity(res: Parameters<RequestHandler>[1]): Identity {
  return res.locals.identity as Identity;
}

export function getAccount(res: Parameters<RequestHandler>[1]): AccountContext {
  return res.locals.account as AccountContext;
}

export const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Sign in is required." });
    return;
  }

  const claims = auth.sessionClaims as Record<string, unknown> | null;
  const email =
    typeof claims?.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!email) {
    res.status(403).json({ error: "A verified account email is required." });
    return;
  }

  const firstName =
    typeof claims?.firstName === "string" ? claims.firstName.trim() : "";
  const lastName =
    typeof claims?.lastName === "string" ? claims.lastName.trim() : "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
  res.locals.identity = {
    authId: auth.userId,
    email,
    firstName: firstName || name.split(" ")[0],
    name,
  } satisfies Identity;
  next();
};

export async function findUser(authId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.authId, authId))
    .limit(1);
  return user;
}

export async function resolveUserRole(user: User, identity: Identity): Promise<User> {
  const isConfiguredAdmin = configuredAdminEmail() === identity.email;
  if (user.role === "admin" && !isConfiguredAdmin) {
    const [studentProfile] = await db
      .select({ userId: studentProfilesTable.userId })
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.userId, user.id))
      .limit(1);
    const role = studentProfile ? "student" : "resident";
    const [updated] = await db
      .update(usersTable)
      .set({ role })
      .where(eq(usersTable.id, user.id))
      .returning();
    return updated ?? { ...user, role };
  }

  if (isConfiguredAdmin && user.role !== "admin") {
    return db.transaction(async (tx) => {
      await tx
        .update(usersTable)
        .set({ role: "student" })
        .where(and(eq(usersTable.role, "admin"), ne(usersTable.id, user.id)));
      const [updated] = await tx
        .update(usersTable)
        .set({ role: "admin" })
        .where(eq(usersTable.id, user.id))
        .returning();
      return updated ?? { ...user, role: "admin" };
    });
  }

  return user;
}

export const requireAccount: RequestHandler = async (req, res, next) => {
  const identity = getIdentity(res);
  try {
    const existingUser = await findUser(identity.authId);
    if (!existingUser) {
      res.status(403).json({ error: "Finish account setup before continuing." });
      return;
    }
    const user = await resolveUserRole(existingUser, identity);
    res.locals.account = { identity, user } satisfies AccountContext;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Could not resolve Launch Lane account role");
    res.status(500).json({ error: "We couldn't check your account. Please try again." });
  }
};

export function requireRole(role: User["role"]): RequestHandler {
  return (_req, res, next) => {
    const account = getAccount(res);
    if (account.user.role !== role) {
      res.status(403).json({ error: `${role[0].toUpperCase()}${role.slice(1)} access is required.` });
      return;
    }
    next();
  };
}
