/** Scalar configuration — config-first, CSS-hacks-last.
 *
 * The audit's key finding was that almost everything the portal needed from
 * Scalar is supported, serializable configuration rather than something to
 * fight with CSS. Verified against the installed type surface
 * (@scalar/types/dist/api-reference/api-reference-configuration.d.ts) and in a
 * browser harness:
 *
 *   showDeveloperTools: "never" removes Developer Tools and the
 *                               Configure · Share · Deploy toolbar
 *                               (`showToolbar` is its deprecated alias)
 *   hideSearch: true            Qeet owns search (the ⌘K palette)
 *   layout: "classic"           kills the empty-canvas problem, adds
 *                               breadcrumbs, and frees the left rail for the
 *                               Qeet-owned API navigation
 *
 * Function-valued config works: @scalar/client-side-rendering serializes
 * functions with `Function.prototype.toString()`. They therefore must be
 * **closure-free** — only the source text reaches the browser, so anything
 * captured from module scope would be `undefined` there. That is why the slug
 * helpers below are inlined rather than imported.
 */
// `?raw` gives the stylesheet as a string without also injecting it as a
// page stylesheet — Scalar wants it as a `customCss` value.
import customCss from "../styles/scalar.css?raw";
import { serversFor } from "./environments";
import { PRODUCTS } from "./products";
import type { ProductConfig } from "../types/product";
import { SITE } from "./site";

/** Client order per §16: cURL first, then the languages Qeet actually targets. */
const PREFERRED_CLIENTS = {
  shell: ["curl"],
  node: ["undici", "fetch", "axios"],
  python: ["requests", "httpx_sync"],
  go: ["native"],
  java: ["okhttp", "nethttp"],
  csharp: ["httpclient", "restsharp"],
} as const;

/**
 * Everything else moves behind "More" rather than being deleted — §16 says not
 * to remove Scalar's supported languages, just to stop them competing for
 * first position.
 */
const DEMOTED_CLIENTS = [
  "c",
  "clojure",
  "http",
  "httpie",
  "kotlin",
  "objc",
  "ocaml",
  "php",
  "powershell",
  "r",
  "ruby",
  "rust",
  "swift",
  "wget",
] as const;

/**
 * The route for a product's reference. Qeet ID lives at `/reference` so the
 * original route keeps working and stays the canonical entry point; the others
 * get their own page. One product per page is what removes Scalar's document
 * selector — with a single `source` there is nothing for it to switch between,
 * so the Qeet product switcher is the only one on screen, and each product's
 * URL is real and shareable.
 */
export const referenceHref = (productId: string) =>
  productId === PRODUCTS[0].id ? "/reference" : `/reference/${productId}`;

/**
 * Scalar's runtime, pinned to an exact version.
 *
 * `@scalar/astro` otherwise loads `https://cdn.jsdelivr.net/npm/@scalar/api-reference`
 * with no version and no SRI, so the reference silently tracks whatever was
 * published most recently — a rendering change (or a bad publish) would land in
 * production without a deploy. Pinning also lets the CSP name one exact URL.
 *
 * Bump deliberately, and re-run the reference QA in the plan's Phase 11.
 */
const SCALAR_VERSION = "1.69.1";
export const SCALAR_CDN = `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}`;

/**
 * Same-origin proxy for the API client's Send button — **on by default**.
 *
 * Needed because no Qeet service sends `Access-Control-Allow-Origin`, local
 * ones included. Verified: `http://localhost:4001/healthz` answers 200 to curl
 * and "Failed to fetch" to a browser on the same machine. Without the proxy,
 * Send cannot work at all.
 *
 * This is why the portal is meant to be **run locally** alongside your stack
 * (`bun run dev`): the proxy is server-side, so it shares a machine with your
 * API and can reach `localhost`. On a *deployed* instance the proxy runs
 * elsewhere and cannot see your machine — for Try It to work there, the local
 * service has to allow the portal's origin, which is the real fix regardless.
 *
 * Set `PUBLIC_QEET_PROXY_URL=` (empty) to bypass it and call APIs directly —
 * useful once a service does send CORS headers, and to see the raw error.
 *
 * Deliberately never Scalar's hosted proxy (`proxy.scalar.com`): these
 * requests carry live API keys, which must not transit a third party.
 */
const PROXY_URL = import.meta.env.PUBLIC_QEET_PROXY_URL ?? "/api/proxy";

const BASE_CONFIG = {
  cdn: SCALAR_CDN,
  ...(PROXY_URL ? { proxyUrl: PROXY_URL } : {}),
  // ---- Qeet owns the chrome ------------------------------------------------
  theme: "none" as const,
  /**
   * `modern` rather than `classic`, with Scalar's own sidebar switched off.
   *
   * `classic` is denser and adds breadcrumbs, but it renders each tag's
   * operations only when that section is expanded — so a Qeet sidebar link had
   * no anchor to resolve against and Scalar never navigated. `modern` renders
   * every operation as a real section with a real id, which is what makes the
   * Qeet-owned navigation actually drive the document. `showSidebar: false`
   * removes the competing second sidebar that `modern` would otherwise bring.
   */
  layout: "classic" as const,
  showSidebar: false,
  showDeveloperTools: "never" as const,
  hideSearch: true,
  hideDarkModeToggle: true,
  withDefaultFonts: false,

  // ---- safety --------------------------------------------------------------
  /**
   * Credentials must never silently persist in browser storage on a public
   * portal — a shared machine would leak the previous reader's key (O1).
   */
  persistAuth: false,

  // ---- documents -----------------------------------------------------------
  documentDownloadType: "yaml" as const,
  hideModels: false,
  favicon: "/brand/favicon.svg",

  // ---- code samples --------------------------------------------------------
  defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
  hiddenClients: [...DEMOTED_CLIENTS] as string[],

  // ---- anchors -------------------------------------------------------------
  /**
   * `defaultOpenAllTags` is load-bearing, not cosmetic: Scalar renders an
   * operation's section (and therefore its anchor) only once its tag is open,
   * so without this a Qeet sidebar link has nothing to resolve against and the
   * document never moves. With it, all of a product's operations carry ids.
   *
   * No `generateTagSlug` / `generateOperationSlug` here — function values do
   * not survive `renderMode="client"` (Astro JSON-serializes the prop). The
   * sidebar mirrors Scalar's default slug format instead; see
   * src/lib/api/openapi.ts.
   */
  defaultOpenAllTags: true,

  // ---- theme ---------------------------------------------------------------
  /** See src/styles/scalar.css: identical light/dark blocks bound to Qeet
   *  tokens, which is what removes the need for any theme-sync JavaScript. */
  customCss,
} as const;

/** The full Scalar configuration for one product's reference page. */
export function scalarConfigFor(product: ProductConfig) {
  return {
    ...BASE_CONFIG,
    // A single source: no document selector, and the page is about one API.
    sources: [{ slug: product.id, title: product.name, url: product.bundleUrl, default: true }],
    servers: serversFor(product),
    pageTitle: `${product.name} API Reference | ${SITE.name}`,
    /**
     * Qeet Pay's 273 operations carry neither summary nor description, so its
     * titles fall back to the path. The other two products have full summary
     * coverage and read better with it.
     */
    operationTitleSource: (product.id === "qeet-pay" ? "path" : "summary") as "path" | "summary",
    hideTestRequestButton: !product.tryIt,
  };
}

export { PREFERRED_CLIENTS };
