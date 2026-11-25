import { Router } from "express";
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
  residentProfilesTable,
  studentProfilesTable,
  usersTable,
  type User,
} from "@workspace/db";
import {
  findUser,
  findOrProvisionAdmin,
  getIdentity,
  requireSignedIn,
  resolveUserRole,
} from "../lib/authorization";
import { deriveResidentStreetName } from "../lib/resident-street";

const router = Router();

async function accountResponse(user: User, identity: ReturnType<typeof getIdentity>) {
  const resolvedUser = await resolveUserRole(user, identity);
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
    res.status(400).json({ error: "Choose Student, Resident, or Parent / Guardian to continue." });
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
    const user = await findOrProvisionAdmin(identity);
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

    const user = await resolveUserRole(existingUser, identity);
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
        .values({
          userId: user.id,
          ...parsed.data,
          guardianEmail: parsed.data.guardianEmail.toLowerCase(),
        })
        .onConflictDoUpdate({
          target: studentProfilesTable.userId,
          set: {
            ...parsed.data,
            guardianEmail: parsed.data.guardianEmail.toLowerCase(),
          },
        });
    } else if (user.role === "resident") {
      const parsed = ResidentProfileInput.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Enter your home address to finish your profile." });
        return;
      }
      await db
        .insert(residentProfilesTable)
        .values({
          userId: user.id,
          ...parsed.data,
          streetName: deriveResidentStreetName(parsed.data.homeAddress),
        })
        .onConflictDoUpdate({
          target: residentProfilesTable.userId,
          set: {
            ...parsed.data,
            streetName: deriveResidentStreetName(parsed.data.homeAddress),
          },
        });
    } else {
      res.status(403).json({ error: "Parent / Guardian accounts do not have a profile to complete." });
      return;
    }

    res.json(await accountResponse(user, identity));
  } catch (error) {
    req.log.error({ err: error }, "Could not save private Launch Lane profile");
    res.status(500).json({ error: "We couldn't save your profile. Please try again." });
  }
});

export default router;
