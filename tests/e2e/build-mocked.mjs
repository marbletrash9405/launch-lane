// Test-only: bundles the real API with stand-ins for Clerk (sign-in) and Vercel Blob,
// so the whole flow can run against a real Postgres without cloud accounts.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const requireFromApi = createRequire(path.join(repo, "artifacts/api-server/package.json"));
const { build } = requireFromApi("esbuild");
const root = path.join(repo, "artifacts/api-server");
await build({
  entryPoints: [`${root}/src/vercel.ts`], outfile: path.join(here, ".out/api-mocked.mjs"),
  bundle: true, platform: "node", format: "esm", external: ["*.node", "pg-native"], logLevel: "warning",
  absWorkingDir: root,
  banner: { js: "import { createRequire as __cr } from 'node:module'; globalThis.require = __cr(import.meta.url);" },
  plugins: [{ name: "mocks", setup(b) {
    b.onResolve({ filter: /^(@clerk\/express|@vercel\/blob)$/ }, (a) => ({ path: a.path, namespace: "mock" }));
    b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({ loader: "js", contents: path === "@clerk/express" ? `
      const emailOf = (id) => Buffer.from(id.slice(5), "base64url").toString();
      export const clerkMiddleware = () => (req, _res, next) => next();
      export const getAuth = (req) => { const id = req.headers["x-test-user"]; return { userId: id || null, sessionClaims: id ? {} : null }; };
      export const clerkClient = { users: { getUser: async (id) => ({ id, firstName: emailOf(id).split("@")[0], lastName: "Test",
        primaryEmailAddress: { emailAddress: emailOf(id), verification: { status: "verified" } } }) } };
    ` : `
      const store = globalThis.__blobStore = new Map();
      export async function put(name, body, opts) {
        if (opts.access !== "private") throw new Error("must be private");
        if (store.has(name) && !opts.allowOverwrite) throw new Error("exists");
        store.set(name, { body: Buffer.from(body), contentType: opts.contentType }); return { pathname: name };
      }
      export async function head(name) { const b = store.get(name); if (!b) throw new Error("not found"); return { size: b.body.length, contentType: b.contentType, pathname: name }; }
      export async function get(name, opts) { if (opts.access !== "private") throw new Error("must be private"); const b = store.get(name); if (!b) return null;
        return { statusCode: 200, stream: new Blob([b.body]).stream(), headers: new Headers(), blob: { contentType: b.contentType, size: b.body.length } }; }
    ` }));
  } }],
});
console.log("built");
