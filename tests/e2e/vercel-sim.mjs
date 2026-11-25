// Mimics Vercel's Build Output routing for local testing.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const out = path.resolve(process.argv[2]);
const port = Number(process.argv[3] || 4000);
const fnFile = process.argv[4] || path.join(out, "functions/api.func/index.mjs");
const { default: handler } = await import(pathToFileURL(fnFile).href);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain" };
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  req.headers["x-forwarded-proto"] = "https";
  if (/^\/api(?:\/.*)?$/.test(url.pathname)) return handler(req, res);
  let file = path.join(out, "static", decodeURIComponent(url.pathname));
  try { if (!(await stat(file)).isFile()) throw 0; } catch { file = path.join(out, "static/index.html"); }
  if (url.pathname.startsWith("/assets/")) res.setHeader("cache-control", "public, max-age=31536000, immutable");
  res.setHeader("content-type", types[path.extname(file)] || "application/octet-stream");
  res.end(await readFile(file));
}).listen(port, () => console.log("sim listening", port));
