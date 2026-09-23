// Single source of truth for the API catalog. Both the landing-page catalog
// cards and the Scalar reference (src/pages/reference/index.astro) derive from
// SPECS, so adding a product means editing this file + scripts/sync-specs.mjs.

export interface ApiSpec {
  /** Scalar source slug (also the catalog card anchor). */
  slug: string;
  /** Product family the spec belongs to. */
  product: "Qeet ID" | "Qeet Notify" | "Qeet Pay";
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
    blurb: "Login, signup, sessions and refresh, hosted-login SSO, passkeys and MFA.",
  },
  {
    slug: "qeet-id-management",
    product: "Qeet ID",
    title: "Identity Management",
    url: "/specs/qeet-id/management.yaml",
    blurb: "Users, organizations, roles, permissions and authorization checks.",
  },
  {
    slug: "qeet-id-federation",
    product: "Qeet ID",
    title: "Federation",
    url: "/specs/qeet-id/federation.yaml",
    blurb: "Enterprise SSO over OIDC, SAML, SCIM, LDAP and social connections.",
  },
  {
    slug: "qeet-id-developer",
    product: "Qeet ID",
    title: "Developer",
    url: "/specs/qeet-id/developer.yaml",
    blurb: "API keys, webhooks, secrets, machine identities and AI agents.",
  },
  {
    slug: "qeet-id-operations",
    product: "Qeet ID",
    title: "Operations",
    url: "/specs/qeet-id/operations.yaml",
    blurb: "Audit logs, billing, usage analytics and tenant operations.",
  },
  {
    slug: "qeet-notify-messaging",
    product: "Qeet Notify",
    title: "Messaging",
    url: "/specs/qeet-notify/messaging.yaml",
    blurb: "Events, notifications, templates, workflows and delivery experiments.",
  },
  {
    slug: "qeet-notify-subscribers",
    product: "Qeet Notify",
    title: "Subscribers",
    url: "/specs/qeet-notify/subscribers.yaml",
    blurb: "Subscriber records, consent, and registered devices.",
  },
  {
    slug: "qeet-notify-deliverability",
    product: "Qeet Notify",
    title: "Deliverability",
    url: "/specs/qeet-notify/deliverability.yaml",
    blurb:
      "Providers, suppressions, dead letters, inbound mail, IP warmup and DLT/NDNC compliance.",
  },
  {
    slug: "qeet-notify-operations",
    product: "Qeet Notify",
    title: "Operations",
    url: "/specs/qeet-notify/operations.yaml",
    blurb: "Health, analytics, API keys, audit, billing, environments and broadcasts.",
  },
  {
    slug: "qeet-pay-payments",
    product: "Qeet Pay",
    title: "Payments",
    url: "/specs/qeet-pay/payments.yaml",
    blurb: "Payments, payment links, checkout, mandates, virtual accounts and orchestration.",
  },
  {
    slug: "qeet-pay-payouts",
    product: "Qeet Pay",
    title: "Payouts & Money",
    url: "/specs/qeet-pay/payouts.yaml",
    blurb: "Payouts, ledger, treasury and reconciliation.",
  },
  {
    slug: "qeet-pay-billing",
    product: "Qeet Pay",
    title: "Billing",
    url: "/specs/qeet-pay/billing.yaml",
    blurb: "Subscription billing, dunning and revenue recognition.",
  },
  {
    slug: "qeet-pay-tax",
    product: "Qeet Pay",
    title: "GST & Tax",
    url: "/specs/qeet-pay/tax.yaml",
    blurb: "GST invoicing, e-invoicing (IRN), GST returns, input tax credit and TDS/TCS.",
  },
  {
    slug: "qeet-pay-commerce",
    product: "Qeet Pay",
    title: "Commerce & Embedded Finance",
    url: "/specs/qeet-pay/commerce.yaml",
    blurb: "Marketplace, ONDC, cross-border, lending, BNPL, cards, insurance and escrow.",
  },
  {
    slug: "qeet-pay-risk",
    product: "Qeet Pay",
    title: "Risk & Compliance",
    url: "/specs/qeet-pay/risk.yaml",
    blurb: "KYB, customer KYC, AML and fraud decisioning.",
  },
  {
    slug: "qeet-pay-platform",
    product: "Qeet Pay",
    title: "Platform",
    url: "/specs/qeet-pay/platform.yaml",
    blurb: "Merchants, webhooks, analytics, accounting, messaging and agentic mandates.",
  },
];

/** Scalar `sources` — one entry per PRODUCT (the document switcher). Each URL is
 * the per-product bundle that `bun run sync` merges from that product's source
 * specs, carrying `x-tagGroups` so the reference renders a folder sidebar.
 * `SPECS` above still backs the catalog cards + individual spec downloads. */
export const SCALAR_SOURCES = [
  { slug: "qeet-id", title: "Qeet ID", url: "/specs/qeet-id.yaml" },
  { slug: "qeet-notify", title: "Qeet Notify", url: "/specs/qeet-notify.yaml" },
  { slug: "qeet-pay", title: "Qeet Pay", url: "/specs/qeet-pay.yaml" },
];

/** The Scalar document slug a catalog card points at (one per product). */
export const sourceSlug = (product: ApiSpec["product"]) =>
  product === "Qeet Notify" ? "qeet-notify" : product === "Qeet Pay" ? "qeet-pay" : "qeet-id";

export interface Environment {
  product: string;
  production: string;
  staging: string;
  local: string;
}

// Mirrors scripts/sync-specs.mjs (qeet-context/DOMAIN.md).
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
  {
    product: "Qeet Pay",
    production: "https://api.pay.qeet.in",
    staging: "https://api.pay.staging.qeet.in",
    local: "http://localhost:4201",
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
// notifications, audit, design system). Qeet ID, Notify and Pay expose APIs on
// this portal today; the rest are shown as "coming to the API" — honest, not hype.
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
    href: "/reference",
  },
  {
    name: "Qeet Notify",
    kind: "Notifications",
    blurb: "Multi-channel transactional messaging — email, SMS, WhatsApp, in-app and webhooks.",
    status: "live",
    icon: "bell",
    href: "/reference/qeet-notify",
  },
  {
    name: "Qeet Logs",
    kind: "Observability",
    blurb: "Privacy-first, identity-aware log management — and the group's shared audit sink.",
    status: "soon",
    icon: "activity",
    href: "https://docs.qeet.in/logs",
    external: true,
  },
  {
    name: "Qeet Pay",
    kind: "Payments & Billing",
    blurb: "Payments, subscriptions and billing — India-first, with UPI and GST built in.",
    status: "live",
    icon: "credit-card",
    href: "/reference/qeet-pay",
  },
  {
    name: "Qeet People",
    kind: "Human Capital",
    blurb: "HCM for the modern org — directory, workforce records and people workflows.",
    status: "soon",
    icon: "users",
    href: "https://docs.qeet.in/people",
    external: true,
  },
  {
    name: "Qeet News",
    kind: "News & Media",
    blurb: "AI-first global news platform — multi-perspective, multilingual and trust-first.",
    status: "soon",
    icon: "newspaper",
    href: "https://docs.qeet.in/",
    external: true,
  },
];

// Headline metrics for the hero counter row. Kept deliberately truthful and
// derived from the vendored specs: 780 operations across 3 products (Qeet ID
// 395 in 5 areas, Qeet Notify 112 in 4, Qeet Pay 273 in 7). Re-check with
// `bun run validate:specs` after `bun run sync`.
export interface Stat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}
export const STATS: Stat[] = [
  { value: 780, label: "API operations" },
  { value: 3, label: "live product APIs" },
  { value: 16, label: "API areas" },
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
    title: "One host per API",
    body: "Each product answers on a single canonical hostname — api.id.qeet.in, api.notify.qeet.in, api.pay.qeet.in.",
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
    title: "Scoped credentials",
    body: "OAuth 2.1 scopes and least-privilege API keys secure every call; secrets are never returned by any endpoint.",
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

// ---- Brand logos (text-only, no trademark images) ---------------------------
// (Customer logos intentionally absent: Qeet has no published reference
// customers. The TECH marquee below stands in for them.)

// ---- Why Qeet APIs — six differentiated reasons ----------------------------
export interface Reason {
  icon: string;
  metric: string;
  title: string;
  body: string;
}
export const WHY_QEET: Reason[] = [
  {
    icon: "layers",
    metric: "780 operations",
    title: "The whole surface",
    body: "Every endpoint across Qeet ID, Notify and Pay — 780 operations in 16 documented areas.",
  },
  {
    icon: "activity",
    metric: "OpenAPI 3.1",
    title: "The spec is the source",
    body: "Each document is vendored straight from the service that implements it and validated in CI, so the reference cannot drift from the API.",
  },
  {
    icon: "shield",
    metric: "OAuth 2.1 · OIDC",
    title: "Secure at every layer",
    body: "Passkeys and step-up MFA, scoped API keys, signed webhooks and least-privilege RBAC — documented per endpoint.",
  },
  {
    icon: "globe",
    metric: "Multi-tenant",
    title: "Tenant-isolated by design",
    body: "Every resource is tenant-scoped, with per-tenant policy, domains, branding and data retention.",
  },
  {
    icon: "gauge",
    metric: "Per-key limits",
    title: "Predictable under load",
    body: "Documented rate limits and idempotency keys, so retries and bursts behave the way you expect.",
  },
  {
    icon: "lock",
    metric: "SAML · SCIM · RBAC",
    title: "Enterprise-ready",
    body: "Enterprise SSO over OIDC and SAML, SCIM provisioning, immutable audit logs, and APIs that generate SOC 2 / ISO 27001 evidence from live tenant state.",
  },
];

// ---- Platform metrics (big-number dark section) ----------------------------
export interface PlatformMetric {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sublabel: string;
}
export const PLATFORM_METRICS: PlatformMetric[] = [
  { value: 780, label: "API operations", sublabel: "across three product APIs" },
  { value: 16, label: "API areas", sublabel: "one sidebar folder each" },
  { value: 100, suffix: "%", label: "OpenAPI 3.1", sublabel: "every spec, validated in CI" },
  { value: 3, label: "live product APIs", sublabel: "Qeet ID · Notify · Pay" },
  { value: 6, label: "platform products", sublabel: "one identity across all" },
  { value: 0, label: "hand-written specs", sublabel: "all vendored from the servers" },
];

// ---- Testimonials ----------------------------------------------------------
// (Testimonials intentionally absent: no customer has given attributable
// permission to be quoted here.)

// ---- Pricing tiers ---------------------------------------------------------
export interface PricingFeature {
  text: string;
  included: boolean;
}
export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PricingFeature[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
}
export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Developer",
    price: "Free",
    period: "forever",
    description: "Everything you need to build and ship your first integration.",
    features: [
      { text: "250,000 API requests / month", included: true },
      { text: "Full API reference + live console", included: true },
      { text: "2 SDK languages", included: true },
      { text: "Community support", included: true },
      { text: "SLA & uptime guarantee", included: false },
      { text: "SAML SSO & SCIM", included: false },
    ],
    cta: "Start building",
    ctaHref: "/quickstart",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$149",
    period: "/ month",
    description: "For teams shipping production workloads at scale.",
    features: [
      { text: "10M API requests / month", included: true },
      { text: "Full API reference + live console", included: true },
      { text: "All 4 SDK languages", included: true },
      { text: "Priority email support", included: true },
      { text: "99.9% uptime SLA", included: true },
      { text: "SAML SSO & SCIM", included: false },
    ],
    cta: "Start free trial",
    ctaHref: "https://id.qeet.in",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    description: "For organizations that require compliance, SLA and dedicated support.",
    features: [
      { text: "Unlimited API requests", included: true },
      { text: "Full API reference + live console", included: true },
      { text: "All 4 SDK languages", included: true },
      { text: "Dedicated Slack support", included: true },
      { text: "Dedicated onboarding & migration support", included: true },
      { text: "SAML SSO, SCIM & RBAC", included: true },
    ],
    cta: "Contact sales",
    ctaHref: "mailto:sales@qeet.in",
    highlighted: false,
  },
];

// ---- FAQ -------------------------------------------------------------------
export interface FaqItem {
  question: string;
  answer: string;
}
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How do I authenticate with the Qeet APIs?",
    answer:
      "You can authenticate using an API key (pass it as <code>Authorization: ApiKey &lt;key&gt;</code>) or via OAuth 2.1 with a Bearer token. API keys are created in the Qeet console. For machine-to-machine flows, use the client credentials grant. Full details are in the <a href='/authentication'>Authentication guide</a>.",
  },
  {
    question: "Is one key valid across all Qeet APIs?",
    answer:
      "Yes. A single API key or OAuth token is scoped to the products and permissions you grant it — so one credential can call Qeet ID, Qeet Notify, and any other live product. Scopes are additive and least-privilege by default.",
  },
  {
    question: "Are the API specs publicly available as OpenAPI files?",
    answer:
      "Yes. Every spec is published as OpenAPI 3.1 YAML under <code>api.qeet.in/specs/</code>. The interactive reference is built directly from these files — they're never hand-written, so they're always in sync with the actual API surface.",
  },
  {
    question: "Which SDK languages are supported?",
    answer:
      "The reference ships ready-to-run code snippets for cURL, JavaScript, Go, and Python. Idiomatic SDK packages are on the roadmap. You can also import any spec into Postman — a pre-built collection for Qeet ID is available on the <a href='/sdks'>SDKs page</a>.",
  },
  {
    question: "What does the free Developer plan include?",
    answer:
      "The Developer plan is free forever and includes 250,000 API requests per month, access to the full interactive API reference, and community support. It's designed to let you ship your first integration without a credit card.",
  },
  {
    question: "Do you offer an uptime SLA?",
    answer:
      "Availability commitments are agreed per contract on Enterprise plans — talk to sales for the current terms. We do not publish an SLA figure here, because the number that matters is the one in your agreement.",
  },
  {
    question: "How do webhooks work, and are they signed?",
    answer:
      "Webhooks are delivered as signed HTTP POST payloads — each request includes an <code>X-Qeet-Signature</code> header so you can verify authenticity before processing. Deliveries are retried with exponential backoff. You can subscribe to events in the Qeet console.",
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
