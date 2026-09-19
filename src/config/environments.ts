/** Which environments the reference offers in its Servers dropdown.
 *
 * ── Local only, on purpose ─────────────────────────────────────────────────
 * This portal is an **internal developer tool**: the people using it are Qeet
 * engineers running the services on their own machines. So the only server it
 * offers is that developer's local stack.
 *
 * Production is deliberately absent. A one-click "Send" aimed at the live APIs
 * invites someone to mutate production data while reading the docs, and the
 * portal has no business making that easy. The production hostnames are still
 * in the downloadable OpenAPI documents, which is where they belong — a spec
 * should describe where the real service lives.
 *
 * There is no staging or test tier either: `api.<product>.staging.qeet.in`
 * does not resolve.
 *
 * ── Adding production (or staging) later ──────────────────────────────────
 * Add the entry to `envs()` in ./products.ts. Everything follows from there:
 * the Servers dropdown, the environments table on the guides, and the API
 * client's proxy allow-list. Then set `PUBLIC_QEET_PROXY_URL=/api/proxy`, so
 * requests to that host route through the proxy — the Qeet APIs send no CORS
 * headers, and a browser cannot call them directly.
 *
 * There is intentionally **no** public/internal mode flag. One behaviour for
 * every developer is easier to reason about than a switch that silently
 * changes what the dropdown offers depending on how the app was started.
 */
import { PRODUCTS } from "./products";
import type { ApiEnvironment, ProductConfig } from "../types/product";

/** The environments a product offers, in display order. */
export function environmentsFor(product: ProductConfig): ApiEnvironment[] {
  return product.environments;
}

/** Scalar's `servers` array for a product. */
export function serversFor(product: ProductConfig) {
  return product.environments.map((e) => ({ url: e.url, description: e.name }));
}

/** The first environment — the default target, used in code samples. */
export function defaultBaseUrl(product: ProductConfig): string {
  const first = product.environments[0];
  if (!first) throw new Error(`${product.id} declares no environments`);
  return first.url;
}

/** Rows for the environments table on the guide pages. */
export const ENVIRONMENT_ROWS = PRODUCTS.map((p) => ({
  product: p.name,
  environments: p.environments,
}));
