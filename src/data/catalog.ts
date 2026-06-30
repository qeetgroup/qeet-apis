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
