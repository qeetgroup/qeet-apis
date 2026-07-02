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
  github: "https://github.com/qeetgroup",
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

// ---- Reliability band — engineered-for-production guarantees ---------------
// Architecture-true claims only (no invented SLA numbers): every item is
// backed by the specs / open standards this portal already documents.
export interface Guarantee {
  icon: string;
  title: string;
  body: string;
}
export const RELIABILITY: Guarantee[] = [
  {
    icon: "globe",
    title: "Multi-region edge",
    body: "Requests terminate at the edge closest to your users, with regional failover behind a single hostname.",
  },
  {
    icon: "layers",
    title: "Typed from OpenAPI 3.1",
    body: "Every endpoint and schema is generated from a versioned spec — never hand-written, never stale.",
  },
  {
    icon: "history",
    title: "Versioned & idempotent",
    body: "Explicit API versions with additive-only changes, and idempotency keys that make retries safe.",
  },
  {
    icon: "lock",
    title: "mTLS & scoped keys",
    body: "Mutual TLS, OAuth 2.1 and least-privilege API-key scopes secure every call by default.",
  },
  {
    icon: "activity",
    title: "Full audit trail",
    body: "Every privileged action is written to an immutable, queryable audit log via Qeet Logs.",
  },
  {
    icon: "webhook",
    title: "Event-driven webhooks",
    body: "Subscribe to signed webhooks for the events that matter — no polling, no missed state.",
  },
];

// ---- Documentation wayfinding (each card maps to a real page in this portal).
export interface DocLink {
  icon: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}
export const DOCS: DocLink[] = [
  {
    icon: "zap",
    title: "Quickstart",
    body: "Authenticate and make your first live request in under a minute.",
    href: LINKS.quickstart,
    cta: "Start building",
  },
  {
    icon: "key",
    title: "Authentication",
    body: "API keys, OAuth 2.1 and OIDC — pick the flow that fits your app.",
    href: LINKS.authentication,
    cta: "Read the guide",
  },
  {
    icon: "alert",
    title: "Errors",
    body: "Every error shape, status code and retry signal, documented in one place.",
    href: LINKS.errors,
    cta: "Handle errors",
  },
  {
    icon: "code",
    title: "SDKs",
    body: "Idiomatic snippets for cURL, JavaScript, Go and Python, generated per endpoint.",
    href: LINKS.sdks,
    cta: "Get the code",
  },
  {
    icon: "book",
    title: "API Reference",
    body: "Browse and run every endpoint across products, live in the browser.",
    href: LINKS.reference,
    cta: "Open reference",
  },
  {
    icon: "history",
    title: "Changelog",
    body: "Track additive changes and new endpoints as they ship, per product.",
    href: LINKS.changelog,
    cta: "See what's new",
  },
];

// ---- Enterprise & security capabilities (all backed by the live specs) ------
export const ENTERPRISE: Guarantee[] = [
  {
    icon: "lock",
    title: "Single sign-on",
    body: "OIDC and SAML 2.0 SSO with SCIM 2.0 provisioning for your entire workforce.",
  },
  {
    icon: "users",
    title: "RBAC & organizations",
    body: "Fine-grained roles, permissions and ReBAC checks across multi-tenant organizations.",
  },
  {
    icon: "fingerprint",
    title: "Passkeys & MFA",
    body: "WebAuthn passkeys, TOTP and step-up MFA are first-class on every auth flow.",
  },
  {
    icon: "key",
    title: "Machine identities",
    body: "Scoped API keys, service accounts and AI-agent credentials with least privilege.",
  },
  {
    icon: "gauge",
    title: "Rate limits & quotas",
    body: "Per-key limits with clear rate-limit headers and burst controls on every response.",
  },
  {
    icon: "activity",
    title: "Audit & operations",
    body: "Immutable audit logs, usage analytics and tenant operations across the platform.",
  },
];
