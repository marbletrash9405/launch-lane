#!/bin/bash
# End-to-end test of the real API against a real Postgres, with stand-ins for
# Clerk sign-in and Vercel Blob. WARNING: empties the users and email_logs
# tables of the database you point it at, so only use a throwaway local DB.
#   E2E_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/launchlane_test tests/e2e/run.sh
set -e
cd "$(dirname "$0")/../.."
: "${E2E_DATABASE_URL:?Set E2E_DATABASE_URL to a throwaway local database}"
export DATABASE_URL="$E2E_DATABASE_URL"
pnpm db:push >/dev/null
CLERK_PUBLISHABLE_KEY="pk_test_$(printf 'example.clerk.accounts.dev$' | base64)" pnpm run vercel-build >/dev/null
node tests/e2e/build-mocked.mjs
psql "$DATABASE_URL" -qc "truncate users, email_logs cascade;"
NODE_ENV=production VERCEL=1 VERCEL_URL=localhost:4100 CLERK_PUBLISHABLE_KEY=x CLERK_SECRET_KEY=x \
  ADMIN_EMAIL=launchlanecompany@gmail.com BLOB_READ_WRITE_TOKEN=test \
  node tests/e2e/vercel-sim.mjs .vercel/output 4100 tests/e2e/.out/api-mocked.mjs > tests/e2e/.out/server.log 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 2
node tests/e2e/flow.mjs
