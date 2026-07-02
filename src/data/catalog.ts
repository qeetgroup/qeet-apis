// Single source of truth for the API catalog. Both the landing-page catalog
// cards and the Scalar reference (src/pages/reference/index.astro) derive from
// SPECS, so adding a product means editing this file + scripts/sync-specs.mjs.

export interface ApiSpec {
  /** Scalar source slug (also the catalog card anchor). */
  slug: string;
  /** Product family the spec belongs to. */
  product: "Qeet ID" | "Qeet Notify";
  /** Short spec title (without the product prefix). */
  title: string;
  /** Vendored spec path under public/specs/, served at runtime. */
  url: string;
  /** One-line description for the catalog card. */
  blurb: string;
}

export const SPECS: ApiSpec[] = [
  {
    slug: "qeet-id-auth",
    product: "Qeet ID",
    title: "Authentication & Access",
    url: "/specs/qeet-id/auth.yaml",
    blurb:
      "Login, signup, sessions and refresh, hosted-login SSO, passkeys and MFA.",
  },
  {
    slug: "qeet-id-management",
    product: "Qeet ID",
    title: "Identity Management",
    url: "/specs/qeet-id/management.yaml",
    blurb:
      "Users, organizations, roles, permissions and authorization checks.",
  },
  {
    slug: "qeet-id-federation",
    product: "Qeet ID",
    title: "Federation",
    url: "/specs/qeet-id/federation.yaml",
    blurb:
      "Enterprise SSO over OIDC, SAML, SCIM, LDAP and social connections.",
  },
  {
    slug: "qeet-id-developer",
    product: "Qeet ID",
    title: "Developer",
    url: "/specs/qeet-id/developer.yaml",
    blurb:
      "API keys, webhooks, secrets, machine identities and AI agents.",
  },
  {
    slug: "qeet-id-operations",
    product: "Qeet ID",
    title: "Operations",
    url: "/specs/qeet-id/operations.yaml",
    blurb: "Audit logs, billing, usage analytics and tenant operations.",
  },
  {
    slug: "qeet-notify-v1",
    product: "Qeet Notify",
    title: "Notifications v1",
    url: "/specs/qeet-notify/v1.yaml",
    blurb:
      "Multi-channel transactional messaging — email, SMS, WhatsApp, in-app and webhooks.",
  },
];

/** Scalar `sources` — one entry per PRODUCT (the document switcher). Qeet ID is
 * the bundle that `pnpm sync` builds from the 5 specs (with x-tagGroups → a
 * folder sidebar). `SPECS` above still backs the catalog cards + spec downloads. */
export const SCALAR_SOURCES = [
  { slug: "qeet-id", title: "Qeet ID", url: "/specs/qeet-id.yaml" },
  { slug: "qeet-notify", title: "Qeet Notify", url: "/specs/qeet-notify/v1.yaml" },
];

/** The Scalar document slug a catalog card points at (one per product). */
export const sourceSlug = (product: ApiSpec["product"]) =>
  product === "Qeet Notify" ? "qeet-notify" : "qeet-id";

export interface Environment {
  product: string;
  production: string;
  staging: string;
  local: string;
}

// Mirrors scripts/sync-specs.mjs (qeet-files/DOMAIN-ARCHITECTURE.md).
export const ENVIRONMENTS: Environment[] = [
  {
    product: "Qeet ID",
    production: "https://api.id.qeet.in",
    staging: "https://api.id.staging.qeet.in",
    local: "http://localhost:4001",
  },
  {
    product: "Qeet Notify",
    production: "https://api.notify.qeet.in",
    staging: "https://api.notify.staging.qeet.in",
    local: "http://localhost:8080",
  },
];

// External destinations referenced across the portal.
export const LINKS = {
  reference: "/reference",
  quickstart: "/quickstart",
  authentication: "/authentication",
  errors: "/errors",
  sdks: "/sdks",
  changelog: "/changelog",
  console: "https://id.qeet.in",
  docs: "https://docs.qeet.in",
  status: "https://status.qeet.in",
  postman: "/postman/qeet-id.postman_collection.json",
};

// ---- The Qeet platform (landing-page product suite) -----------------------
// Qeet is a modular, best-of-breed suite that shares one platform (identity,
// notifications, audit, design system). Only ID + Notify expose APIs on this
// portal today; the rest are shown as "coming to the API" — honest, not hype.
export interface Product {
  name: string;
  /** Category label under the name. */
  kind: string;
  /** One-line description for the card. */
  blurb: string;
  /** `live` → linked into the reference; `soon` → linked to product docs. */
  status: "live" | "soon";
  /** Icon name (see Icon.astro). */
  icon: string;
  /** Where the card points. */
  href: string;
  external?: boolean;
}

export const PRODUCTS: Product[] = [
  {
    name: "Qeet ID",
    kind: "Identity & Access",
    blurb:
      "Passkeys-first authentication, MFA, OAuth 2.1 / OIDC, SAML SSO, SCIM, sessions and RBAC.",
    status: "live",
    icon: "fingerprint",
    href: `${"/reference"}#qeet-id`,
  },
  {
    name: "Qeet Notify",
    kind: "Notifications",
    blurb:
      "Multi-channel transactional messaging — email, SMS, WhatsApp, in-app and webhooks.",
    status: "live",
    icon: "bell",
    href: `${"/reference"}#qeet-notify`,
  },
  {
    name: "Qeet Logs",
    kind: "Observability",
    blurb:
      "Privacy-first, identity-aware log management — and the group's shared audit sink.",
    status: "soon",
    icon: "activity",
    href: "https://docs.qeet.in/logs",
    external: true,
  },
  {
    name: "Qeet Pay",
    kind: "Payments & Billing",
    blurb:
      "Payments, subscriptions and billing — India-first, with UPI and GST built in.",
    status: "soon",
    icon: "credit-card",
    href: "https://docs.qeet.in/pay",
    external: true,
  },
  {
    name: "Qeet People",
    kind: "Human Capital",
    blurb:
      "HCM for the modern org — directory, workforce records and people workflows.",
    status: "soon",
    icon: "users",
    href: "https://docs.qeet.in/people",
    external: true,
  },
  {
    name: "Qeet News",
    kind: "News & Media",
    blurb:
      "AI-first global news platform — multi-perspective, multilingual and trust-first.",
    status: "soon",
    icon: "newspaper",
    href: "https://docs.qeet.in/",
    external: true,
  },
];

// Headline metrics for the hero counter row. Kept deliberately truthful:
// the merged Qeet ID spec alone carries 250+ operations across 6 areas.
export interface Stat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}
export const STATS: Stat[] = [
  { value: 250, suffix: "+", label: "API endpoints" },
  { value: 6, label: "product areas" },
  { value: 4, label: "code languages" },
  { value: 100, suffix: "%", label: "OpenAPI 3.1" },
];

// Open standards the platform speaks — a credibility marquee (in lieu of
// customer logos), and genuinely reflects the Qeet ID / federation surface.
export const TECH: string[] = [
  "OAuth 2.1",
  "OpenID Connect",
  "SAML 2.0",
  "SCIM 2.0",
  "WebAuthn",
  "Passkeys",
  "OpenAPI 3.1",
  "JWT / JWKS",
  "Webhooks",
  "mTLS",
  "RBAC / ReBAC",
  "Multi-tenant",
];
