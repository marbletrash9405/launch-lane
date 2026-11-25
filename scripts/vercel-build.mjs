// Builds Launch Lane for Vercel using the Build Output API:
//   .vercel/output/static            the website (Vite build)
//   .vercel/output/functions/api.func the Express API as one serverless function
//   .vercel/output/config.json       routing: /api/* -> function, everything else -> site
import { execSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".vercel", "output");
const functionDir = path.join(output, "functions", "api.func");

function run(command, env = {}) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
}

const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error(
    "CLERK_PUBLISHABLE_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.",
  );
}

await rm(output, { recursive: true, force: true });

// 1. Create/update the database tables on Vercel deploys (production and
//    preview). Additive changes only: drizzle stops and fails the build rather
//    than deleting data. Set SKIP_DB_PUSH=1 to turn this off.
if (process.env.VERCEL && process.env.DATABASE_URL && process.env.SKIP_DB_PUSH !== "1") {
  run("pnpm --filter @workspace/db run push");
}

// 2. Website
run("pnpm --filter @workspace/launch-lane run build", {
  BASE_PATH: "/",
  NODE_ENV: "production",
  VITE_CLERK_PUBLISHABLE_KEY: publishableKey,
});
await cp(path.join(root, "artifacts/launch-lane/dist/public"), path.join(output, "static"), { recursive: true });

// 3. API function
run(`node artifacts/api-server/build.mjs --vercel "${functionDir}"`, { NODE_ENV: "production" });
await writeFile(
  path.join(functionDir, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false }, null, 2),
);

// 4. Routing
await mkdir(output, { recursive: true });
await writeFile(
  path.join(output, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/assets/(.*)$", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
        { src: "^/api(?:/.*)?$", dest: "/api" },
        { handle: "filesystem" },
        { src: "^/assets/.*$", status: 404 },
        { src: "^/.*$", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);
console.log("\nVercel build output ready in .vercel/output");
