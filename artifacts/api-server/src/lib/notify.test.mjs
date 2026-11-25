import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const directory = await mkdtemp(join(tmpdir(), "launch-lane-mail-"));
try {
  for (const connected of [true, false]) {
    const outfile = join(directory, `notify-${connected}.mjs`);
    await build({
      entryPoints: [new URL("./notify.js", import.meta.url).pathname],
      outfile, bundle: true, platform: "node", format: "esm",
      define: {
        "process.env.RESEND_API_KEY": "undefined",
        "process.env.RESEND_USE_CONNECTOR": JSON.stringify(String(connected)),
        "process.env.NOTIFY_EMAIL": JSON.stringify("founder@example.test"),
        "process.env.NOTIFY_FROM": "undefined",
        "process.env.RESEND_API_URL": "undefined",
      },
      plugins: [{
        name: "email-test-adapters",
        setup(bundler) {
          bundler.onResolve({ filter: /^(@workspace\/db|@replit\/connectors-sdk|\.\/logger)$/ }, args => ({
            path: args.path, namespace: "fixture",
          }));
          bundler.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
            contents: path === "@replit/connectors-sdk" ? `
              export const mailState = { calls: [], status: 200, response: {id:"provider-test-id"} };
              export class ReplitConnectors {
                async proxy(...args) {
                  mailState.calls.push(args);
                  return new Response(JSON.stringify(mailState.response), {status:mailState.status});
                }
              }
            ` : path === "./logger" ? `
              export const logger = {info(){}, error(){}};
            ` : `
              export const records = [];
              export const emailLogsTable = {};
              export const desc = value => value;
              export const sql = () => "";
              export const db = {transaction: async callback => callback({
                insert: () => ({values: async entry => records.push(entry)}),
                execute: async () => {}
              })};
            `,
          }));
        },
      }],
      footer: { js: "export { mailState, records };" },
    });
    const module = await import(pathToFileURL(outfile).href);
    const result = await module.sendNotification({
      subject: "Job review needed: TEST",
      intro: "A review is needed.",
      rows: [["Title", "TEST"]],
    });
    assert.equal(result.status, connected ? "sent" : "logged");
    assert.deepEqual(module.records[0].to, ["founder@example.test"]);
    assert.equal(module.mailState.calls.length, connected ? 1 : 0);
    if (connected) {
      const [connector, endpoint, options] = module.mailState.calls[0];
      assert.equal(connector, "resend");
      assert.equal(endpoint, "/emails");
      assert.equal(options.body.subject, "Job review needed: TEST");
      assert.ok(options.headers["Idempotency-Key"]);
      module.mailState.status = 403;
      module.mailState.response = {message:"Sender domain must be verified"};
      assert.equal((await module.sendNotification({subject:"TEST failure",intro:"TEST",rows:[]})).status, "failed");
      assert.match(module.records.at(-1).detail, /403.*Sender domain must be verified/);
    }
    const before = module.mailState.calls.length;
    assert.equal((await module.sendEmail({
      to:["student@launch-lane-test.invalid"],
      cc:["guardian@launch-lane-test.invalid"],
      subject:"Synthetic recipient", text:"TEST",
    })).status, "logged");
    assert.equal(module.mailState.calls.length, before, "Synthetic addresses must never be emailed");
  }
  console.log("PASS: connected Resend delivery, founder routing, provider error logging, unconfigured fallback, and synthetic recipient protection.");
} finally {
  await rm(directory, {recursive:true, force:true});
}
