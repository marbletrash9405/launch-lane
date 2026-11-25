import { getAuth } from "@clerk/express";
import { Router, type RequestHandler } from "express";
import {
  AuthUserResponse,
  RegisterAccountInput,
  ResidentProfileInput,
  StudentProfileInput,
} from "@workspace/api-zod";
import {
  db,
  and,
  eq,
  ne,
  residentProfilesTable,
  studentProfilesTable,
  usersTable,
  type User,
} from "@workspace/db";

type Identity = {
  authId: string;
  email: string;
  firstName: string;
  name: string;
};

const router = Router();

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
}

const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Sign in is required." });
    return;
  }

  const claims = auth.sessionClaims as Record<string, unknown>;
  const email =
    typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!email) {
    res.status(403).json({ error: "A verified account email is required." });
    return;
  }

  const firstName =
    typeof claims.firstName === "string" ? claims.firstName.trim() : "";
  const lastName =
    typeof claims.lastName === "string" ? claims.lastName.trim() : "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
  res.locals.identity = {
    authId: auth.userId,
    email,
    firstName: firstName || name.split(" ")[0],
    name,
  } satisfies Identity;
  next();
};

function getIdentity(res: Parameters<RequestHandler>[1]): Identity {
  return res.locals.identity as Identity;
}

async function findUser(authId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.authId, authId))
    .limit(1);
  return user;
}

async function resolveRole(user: User, identity: Identity): Promise<User> {
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

async function accountResponse(user: User, identity: Identity) {
  const resolvedUser = await resolveRole(user, identity);
  let profileComplete = true;

  if (resolvedUser.role === "student") {
    const [profile] = await db
      .select({ userId: studentProfilesTable.userId })
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.userId, resolvedUser.id))
      .limit(1);
    profileComplete = Boolean(profile);
  } else if (resolvedUser.role === "resident") {
    const [profile] = await db
      .select({ userId: residentProfilesTable.userId })
      .from(residentProfilesTable)
      .where(eq(residentProfilesTable.userId, resolvedUser.id))
      .limit(1);
    profileComplete = Boolean(profile);
  }

  return AuthUserResponse.parse({
    firstName: identity.firstName || resolvedUser.name.split(" ")[0],
    email: identity.email,
    role: resolvedUser.role,
    profileComplete,
  });
}

router.post("/auth/register", requireSignedIn, async (req, res) => {
  const parsed = RegisterAccountInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose Student or Resident to continue." });
    return;
  }

  const identity = getIdentity(res);
  try {
    let user = await findUser(identity.authId);

    if (!user) {
      const [sameEmail] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, identity.email))
        .limit(1);
      if (sameEmail) {
        res.status(409).json({ error: "This email is already linked to another account." });
        return;
      }

      const [created] = await db
        .insert(usersTable)
        .values({
          authId: identity.authId,
          email: identity.email,
          name: identity.name,
          role: parsed.data.role,
        })
        .returning();
      user = created;
    } else if (user.email !== identity.email || user.name !== identity.name) {
      const [updated] = await db
        .update(usersTable)
        .set({ email: identity.email, name: identity.name })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = updated ?? user;
    }

    res.json(await accountResponse(user, identity));
  } catch (error) {
    req.log.error({ err: error }, "Could not register Launch Lane account");
    res.status(500).json({ error: "We couldn't set up your account. Please try again." });
  }
});

router.get("/auth/me", requireSignedIn, async (req, res) => {
  const identity = getIdentity(res);
  try {
    const user = await findUser(identity.authId);
    if (!user) {
      res.status(404).json({ error: "Choose a role to finish setting up your account." });
      return;
    }
    res.json(await accountResponse(user, identity));
  } catch (error) {
    req.log.error({ err: error }, "Could not load Launch Lane account");
    res.status(500).json({ error: "We couldn't load your account. Please try again." });
  }
});

router.patch("/auth/profile", requireSignedIn, async (req, res) => {
  const identity = getIdentity(res);
  try {
    const existingUser = await findUser(identity.authId);
    if (!existingUser) {
      res.status(404).json({ error: "Choose a role before completing your profile." });
      return;
    }

    const user = await resolveRole(existingUser, identity);
    if (user.role === "admin") {
      res.status(403).json({ error: "Admin accounts do not need a profile." });
      return;
    }

    if (user.role === "student") {
      const parsed = StudentProfileInput.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Enter an age from 13 to 18 and all required student profile details." });
        return;
      }
      await db
        .insert(studentProfilesTable)
        .values({ userId: user.id, ...parsed.data })
        .onConflictDoUpdate({
          target: studentProfilesTable.userId,
          set: parsed.data,
        });
    } else {
      const parsed = ResidentProfileInput.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Enter your home address to finish your profile." });
        return;
      }
      await db
        .insert(residentProfilesTable)
        .values({ userId: user.id, ...parsed.data })
        .onConflictDoUpdate({
          target: residentProfilesTable.userId,
          set: parsed.data,
        });
    }

    res.json(await accountResponse(user, identity));
  } catch (error) {
    req.log.error({ err: error }, "Could not save private Launch Lane profile");
    res.status(500).json({ error: "We couldn't save your profile. Please try again." });
  }
});

export default router;
