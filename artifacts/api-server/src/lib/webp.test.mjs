import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const dir = await mkdtemp(join(tmpdir(), "launch-lane-webp-"));
try {
  const outfile = join(dir, "webp.mjs");
  await build({ entryPoints: [new URL("./webp.ts", import.meta.url).pathname], outfile, bundle: true, platform: "node", format: "esm" });
  const { readWebpInfo } = await import(pathToFileURL(outfile).href);
  const fixture = (name) => readFile(new URL(`./__fixtures__/${name}`, import.meta.url));

  assert.deepEqual(readWebpInfo(await fixture("lossy.webp")), { width: 1200, height: 800 });
  assert.deepEqual(readWebpInfo(await fixture("lossless.webp")), { width: 321, height: 123 });
  assert.deepEqual(readWebpInfo(await fixture("alpha.webp")), { width: 1601, height: 900 });
  assert.equal(readWebpInfo(await fixture("not.png")), null);
  assert.equal(readWebpInfo(Buffer.from("RIFF\0\0\0\0WEBPjunkjunkjunkjunkjunkjunk")), null);
  assert.equal(readWebpInfo(Buffer.alloc(10)), null);
  console.log("webp tests passed");
} finally {
  await rm(dir, { recursive: true, force: true });
}
