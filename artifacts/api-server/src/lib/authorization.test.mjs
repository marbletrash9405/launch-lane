import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// Bundle the real middleware against controlled Clerk/DB adapters. No live
// credentials, users, or application data are read or changed by these tests.
const directory = await mkdtemp(join(tmpdir(), "launch-lane-auth-"));
try {
  const output = join(directory, "authorization.mjs");
  await build({
    entryPoints: [new URL("./authorization.ts", import.meta.url).pathname],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    define: { "process.env.ADMIN_EMAIL": JSON.stringify("owner@example.test") },
    plugins: [{
      name: "auth-test-adapters",
      setup(bundler) {
        bundler.onResolve({ filter: /^(@clerk\/express|@workspace\/db)$/ }, (args) => ({
          path: args.path, namespace: "test-adapter",
        }));
        bundler.onLoad({ filter: /.*/, namespace: "test-adapter" }, ({ path }) => ({
          contents: path === "@clerk/express" ? `
            export const state = { user: null, fails: false };
            export const getAuth = (req) => req.testAuth;
            export const clerkClient = { users: { getUser: async () => {
              if (state.fails) throw new Error("Clerk unavailable");
              return state.user;
            } } };
          ` : `
            export const rows = [];
            export const usersTable = { id: "id", authId: "authId", role: "role" };
            export const studentProfilesTable = { userId: "userId" };
            export const eq = (key, value) => (row) => row[key] === value;
            export const ne = (key, value) => (row) => row[key] !== value;
            export const and = (...checks) => (row) => checks.every(check => check(row));
            export const db = {
              select: () => ({ from: () => ({
                where: (predicate) => ({ limit: async () => rows.filter(predicate) })
              }) }),
              insert: () => ({ values: (value) => ({
                onConflictDoNothing: async () => {
                  if (!rows.some(row => row.authId === value.authId || row.email === value.email)) {
                    rows.push({ id: "account-" + rows.length, ...value });
                  }
                }
              }) }),
              update: () => ({ set: (values) => ({ where: (predicate) => {
                const changed = rows.filter(predicate);
                changed.forEach(row => Object.assign(row, values));
                const result = Promise.resolve();
                result.returning = async () => changed;
                return result;
              } }) }),
              transaction: async (callback) => callback(db)
            };
          `,
        }));
      },
    }],
    // Expose the same adapter instances used by the bundled middleware.
    footer: {
      js: "export { state as testClerk, rows as testRows };",
    },
  });
  const {
    requireSignedIn, findOrProvisionAdmin, resolveUserRole, requireRole,
    testClerk, testRows,
  } = await import(pathToFileURL(output).href);

  async function authenticate(testAuth) {
    const result = { next: false, status: 200, body: null, locals: {} };
    const req = { testAuth, log: { error() {} } };
    const res = {
      locals: result.locals,
      status(code) { result.status = code; return this; },
      json(body) { result.body = body; return this; },
    };
    await requireSignedIn(req, res, () => { result.next = true; });
    return result;
  }

  testClerk.user = {
    firstName: "Founder", lastName: "Test",
    primaryEmailAddress: {
      emailAddress: " OWNER@EXAMPLE.TEST ",
      verification: { status: "verified" },
    },
  };
  const signedIn = await authenticate({ userId: "verified-founder", sessionClaims: {} });
  assert.equal(signedIn.next, true, "Missing custom email claim must not block sign-in");
  assert.equal(signedIn.locals.identity.email, "owner@example.test");
  const admin = await findOrProvisionAdmin(signedIn.locals.identity);
  assert.equal(admin.role, "admin", "Verified configured founder should provision as admin");
  await findOrProvisionAdmin(signedIn.locals.identity);
  assert.equal(testRows.length, 1, "First-sign-in provisioning should be idempotent");

  const otherIdentity = { authId: "other", email: "other@example.test", name: "Other", firstName: "Other" };
  assert.equal(await findOrProvisionAdmin(otherIdentity), undefined, "Other users must choose a signup role");
  const resident = { id: "resident", ...otherIdentity, role: "resident" };
  assert.equal((await resolveUserRole(resident, otherIdentity)).role, "resident");
  let denied = false;
  requireRole("admin")({}, {
    locals: { account: { user: resident, identity: otherIdentity } },
    status(code) { denied = code === 403; return this; },
    json() {},
  }, () => { throw new Error("Resident was allowed admin access"); });
  assert.equal(denied, true);

  testClerk.user.primaryEmailAddress.verification.status = "unverified";
  assert.equal((await authenticate({
    userId: "unverified",
    sessionClaims: { email: "owner@example.test" },
  })).status, 403, "A claim cannot bypass verified-email ownership");
  assert.equal((await authenticate({ userId: null })).status, 401);
  testClerk.fails = true;
  assert.equal((await authenticate({ userId: "verified-founder" })).status, 503);
  console.log("PASS: verified identity without custom claims, admin bootstrap, idempotency, non-admin denial, unverified denial, signed-out denial, Clerk outage.");
} finally {
  await rm(directory, { recursive: true, force: true });
}
