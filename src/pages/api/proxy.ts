/**
 * Same-origin request proxy for the API client's "Send" button.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * The Qeet APIs do not send `Access-Control-Allow-Origin`, so a browser cannot
 * call them from the portal. Verified 2026-09-19:
 *
 *   curl  https://api.id.qeet.in/healthz                  → 200
 *   fetch('https://api.id.qeet.in/healthz') in the page   → "Failed to fetch"
 *   OPTIONS preflight                                     → 200, but zero
 *                                                            Access-Control-* headers
 *
 * **The real fix is CORS on the API** (allow the portal origin, plus the
 * `Authorization` / `X-Api-Key` / `X-Qeet-Api-Key` request headers).
 *
 * It is **off by default** — see `PROXY_URL` in src/config/scalar.ts. The only
 * server the reference offers is the developer's own localhost, which the
 * browser reaches directly. This endpoint exists for the moment a remote
 * environment is added to `envs()` in src/config/products.ts.
 *
 * Scalar calls it as `/api/proxy?scalar_url=<encoded absolute url>` — that
 * query-parameter contract is Scalar's, not ours.
 *
 * ── Why it is an Astro endpoint, not a bare `api/` file ────────────────────
 * A plain `api/proxy.ts` at the repo root is only executable by Vercel's
 * zero-config function detection. Locally, Vite serves it as a *module*: the
 * request returned 200 with `Content-Type: text/javascript` and this file's own
 * transpiled source as the body, which looked like a successful request
 * returning nonsense. As an Astro route with `prerender = false` it executes
 * identically in `astro dev` and on Vercel.
 *
 * ── Security ───────────────────────────────────────────────────────────────
 * An open proxy is an SSRF liability, so this one is deliberately narrow:
 *   • only the three documented Qeet production API hosts are reachable
 *   • https only
 *   • redirects are not followed (a 3xx would escape the allow-list)
 *   • hop-by-hop and infrastructure headers are stripped both ways
 *   • nothing is logged — requests carry live API keys
 *   • 30s timeout, so a hung upstream cannot pin a function open
 */
import type { APIRoute } from "astro";
import { environmentsFor } from "../../config/environments";
import { PRODUCTS } from "../../config/products";

/** The one on-demand route in an otherwise prerendered site. */
export const prerender = false;

/**
 * The allow-list is **derived from src/config/products.ts**, not restated here.
 *
 * It used to be a second literal list, which is a drift hazard in exactly the
 * worst place: adding an environment to the config would silently leave the
 * proxy rejecting it, and removing one would silently leave the proxy still
 * forwarding to it. Deriving it means the Servers dropdown and the proxy can
 * never disagree about what is reachable.
 *
 * Still a literal set at runtime: every entry comes from an explicit config
 * line, never a wildcard. Today that is localhost only, so this endpoint can
 * reach nothing but a developer's own stack.
 */
const allowedHosts = (): Set<string> => {
  const hosts = new Set<string>();
  for (const product of PRODUCTS) {
    for (const env of environmentsFor(product)) {
      try {
        hosts.add(new URL(env.url).hostname);
      } catch {
        // A malformed URL is caught by `bun run validate:specs`; skip it here
        // rather than taking the whole endpoint down.
      }
    }
  }
  return hosts;
};

const ALLOWED_HOSTS = allowedHosts();

/** Loopback, which is the one case where plain http is acceptable. */
const isLocalhost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

/**
 * True when this code is running on Vercel rather than on a developer's
 * machine. Vercel sets `VERCEL=1` in every runtime.
 *
 * It matters because a loopback target means something different on each side:
 * run locally, `localhost` is the developer's own API; deployed, it is the
 * serverless function's loopback, where nothing is listening. Detecting that
 * lets us fail with an explanation instead of a bare timeout.
 *
 * A function rather than a module constant, so it reflects the environment at
 * request time — which also keeps it testable without module-cache tricks.
 */
const onVercel = () =>
  (typeof process !== "undefined" && process.env?.VERCEL === "1") ||
  import.meta.env.VERCEL === "1";

/** True when a loopback host is actually allow-listed for this build. */
const LOCAL_ALLOWED = [...ALLOWED_HOSTS].some(isLocalhost);

/** Headers that belong to our hop and must not be forwarded upstream. */
const STRIP_REQUEST_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "origin",
  "proxy-authorization",
  "referer",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  // Cookies and CDN identity headers — upstream has no business seeing them.
  "cookie",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "x-vercel-id",
  "x-vercel-ip-country",
  "x-vercel-forwarded-for",
]);

/** Response headers that describe our hop rather than the upstream payload. */
const STRIP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  // Never let an upstream Set-Cookie land on the portal's own origin.
  "set-cookie",
]);

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** Handles every method: the API client can send any verb. */
export const ALL: APIRoute = async ({ request, url }) => {
  const target = url.searchParams.get("scalar_url");

  if (!target) {
    return json(400, {
      error: "missing_target",
      message: "Expected a `scalar_url` query parameter with the absolute request URL.",
    });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return json(400, { error: "invalid_target", message: "`scalar_url` is not a valid URL." });
  }

  // A local stack is nearly always plain http, so loopback is the one case
  // where http is allowed — and only when this build allow-lists it.
  const local = LOCAL_ALLOWED && isLocalhost(targetUrl.hostname);

  if (targetUrl.protocol !== "https:" && !(local && targetUrl.protocol === "http:")) {
    return json(400, {
      error: "insecure_target",
      message: LOCAL_ALLOWED
        ? "Only http and https are proxied, and http only for localhost."
        : "Only https targets are proxied.",
    });
  }

  if (!local && !ALLOWED_HOSTS.has(targetUrl.hostname)) {
    return json(403, {
      error: "host_not_allowed",
      message: `${targetUrl.hostname} is not a configured Qeet API host. Add it to envs() in src/config/products.ts if it should be reachable.`,
      allowed: [...ALLOWED_HOSTS],
    });
  }

  // CORS preflights never need to reach upstream: the request that follows is
  // same-origin from the browser's point of view.
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }

  // A deployed proxy cannot reach the reader's machine. Say so, rather than
  // spending 30 seconds on a connection that can never succeed.
  if (onVercel() && isLocalhost(targetUrl.hostname)) {
    return json(502, {
      error: "local_target_unreachable_from_server",
      message:
        `This portal is deployed, so its request proxy runs on the server — "${targetUrl.hostname}" there is the server's own loopback, not your machine. ` +
        "Run the portal locally to send requests to your local stack (`bun run dev`, then open http://localhost:3005/reference/), " +
        "or add CORS headers to your local service and set PUBLIC_QEET_PROXY_URL= (empty) so the browser calls it directly.",
    });
  }

  const headers = new Headers();
  for (const [key, value] of request.headers) {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  }

  /**
   * Buffer the body rather than streaming `request.body` through.
   *
   * Passing a ReadableStream to `fetch` requires `duplex: "half"`, and without
   * it undici throws — which surfaced as every POST/PUT/PATCH failing with a
   * misleading "could not be reached" while the same request succeeded with
   * curl. Buffering avoids the flag entirely and behaves the same on every
   * runtime; API-client payloads are small by nature.
   */
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      // A 3xx to a non-allowed host would bypass the allow-list, so surface
      // redirects to the caller instead of chasing them.
      redirect: "manual",
      signal: controller.signal,
    });

    const responseHeaders = new Headers();
    for (const [key, value] of upstream.headers) {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) responseHeaders.set(key, value);
    }
    responseHeaders.set("cache-control", "no-store");
    // Marks proxied responses so a reader can tell the request did not go
    // straight to the API.
    responseHeaders.set("x-qeet-proxy", "1");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    // Include the underlying reason: an early version always blamed DNS, which
    // sent us hunting a non-existent outage when the real fault was here.
    const reason = error instanceof Error ? error.message : String(error);
    return json(aborted ? 504 : 502, {
      error: aborted ? "upstream_timeout" : "upstream_request_failed",
      message: aborted
        ? `${targetUrl.hostname} did not respond within 30 seconds.`
        : `The request to ${targetUrl.hostname} failed: ${reason}`,
    });
  } finally {
    clearTimeout(timeout);
  }
};
