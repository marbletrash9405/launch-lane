type PublicOriginInput = {
  publicAppUrl?: string;
  forwardedHost?: string | null;
  host?: string | null;
  forwardedProtocol?: string | null;
};

const exactAllowedHosts = new Set([
  "launch-laneco.com",
  "www.launch-laneco.com",
  "localhost",
  "127.0.0.1",
]);

// Vercel sets these to this project's own deployment hostnames, so preview and
// *.vercel.app links work without allowing every vercel.app site.
function vercelHosts() {
  return [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
}

function isAllowedHost(hostname: string) {
  return exactAllowedHosts.has(hostname) || vercelHosts().includes(hostname);
}

export function getPublicOrigin({
  publicAppUrl,
  forwardedHost,
  host,
  forwardedProtocol,
}: PublicOriginInput) {
  const configuredUrl = publicAppUrl?.trim();
  const requestHost =
    forwardedHost?.split(",")[0]?.trim() || host?.split(",")[0]?.trim();
  const requestProtocol =
    forwardedProtocol?.split(",")[0]?.trim().toLowerCase() || "https";
  const value =
    configuredUrl || (requestHost ? `${requestProtocol}://${requestHost}` : "");

  if (!value) {
    throw new Error("Could not determine the Launch Lane website URL.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The Launch Lane website URL is invalid.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (
    !isAllowedHost(hostname) ||
    url.username ||
    url.password ||
    (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) ||
    (hostname.endsWith("launch-laneco.com") &&
      url.port.length > 0 &&
      url.port !== "443")
  ) {
    throw new Error("The website host is not an approved Launch Lane host.");
  }

  return url.origin;
}
