/** The single source of truth for every product the developer platform renders.
 *
 * Every value here is checked against something real:
 *   • `version` and `authentication` are read off the vendored bundles in
 *     public/specs/ (`info.version`, `components.securitySchemes`).
 *   • `lifecycle` comes from qeet-context/PRODUCT-PORTFOLIO.md, not from
 *     marketing copy.
 *   • `specs` mirror the documents scripts/sync-specs.mjs actually writes.
 *   • Optional fields (`sdk`, `statusPage`, `postman`) are omitted when the
 *     thing does not exist, and the UI renders nothing in that case.
 *
 * Adding a product = add a PRODUCTS entry + a scripts/sync-specs.mjs entry. */
import type { ApiEnvironment, ProductConfig } from "../types/product";

/**
 * The servers the reference offers. **Local only** — see ./environments.ts for
 * why production is not here.
 *
 * To add production later, uncomment its line (and set
 * `PUBLIC_QEET_PROXY_URL=/api/proxy`, since the live APIs send no CORS
 * headers). Everything else follows automatically: the Servers dropdown, the
 * guides' environments table, and the proxy allow-list.
 */
const envs = (localPort: number): ApiEnvironment[] => [
  { name: "Local", url: `http://localhost:${localPort}` },
  // Future tiers go here, in the order they should appear, e.g.
  //   { name: "Test",    url: "https://api.<product>.test.qeet.in" },
  //   { name: "Staging", url: "https://api.<product>.staging.qeet.in" },
];

export const PRODUCTS: ProductConfig[] = [
  {
    id: "qeet-id",
    name: "Qeet ID",
    kind: "Identity & Access",
    description:
      "Passkeys-first authentication, MFA, OAuth 2.1 / OIDC, SAML SSO, SCIM provisioning, sessions and RBAC.",
    version: "0.2.0",
    lifecycle: "active",
    icon: "fingerprint",
    bundleUrl: "/specs/qeet-id.yaml",
    environments: envs(4001),
    authentication: {
      label: "Bearer token or API key",
      header: "Authorization",
      schemes: ["bearerAuth", "apiKeyAuth", "clientCredentials", "scimBearer", "ssoCookie"],
    },
    tryIt: true,
    postman: "/postman/qeet-id.postman_collection.json",
    sdk: [
      {
        packageName: "@qeet-id/node",
        registry: "npm",
        published: false,
        platform: "Node.js",
        repo: "https://github.com/qeetgroup/qeet-id-node",
      },
      {
        packageName: "@qeet-id/react",
        registry: "npm",
        published: false,
        platform: "React",
        repo: "https://github.com/qeetgroup/qeet-id-react",
      },
    ],
    specs: [
      {
        slug: "qeet-id-auth",
        title: "Authentication & Access",
        url: "/specs/qeet-id/auth.yaml",
        blurb: "Login, signup, sessions and refresh, hosted-login SSO, passkeys and MFA.",
      },
      {
        slug: "qeet-id-management",
        title: "Identity Management",
        url: "/specs/qeet-id/management.yaml",
        blurb: "Users, tenants, groups, invitations, verification and branding.",
      },
      {
        slug: "qeet-id-federation",
        title: "Federation",
        url: "/specs/qeet-id/federation.yaml",
        blurb: "Enterprise SSO over OIDC, SAML, SCIM, LDAP and social connections.",
      },
      {
        slug: "qeet-id-developer",
        title: "Developer",
        url: "/specs/qeet-id/developer.yaml",
        blurb: "API keys, webhooks, secrets, credentials, machine identities and agents.",
      },
      {
        slug: "qeet-id-operations",
        title: "Operations",
        url: "/specs/qeet-id/operations.yaml",
        blurb: "Audit, GDPR, billing, analytics, health, rate limits and data retention.",
      },
    ],
  },
  {
    id: "qeet-notify",
    name: "Qeet Notify",
    kind: "Notifications",
    description:
      "Multi-channel transactional notifications — messaging and templates, subscribers and consent, deliverability, and platform operations.",
    version: "1.0.0",
    lifecycle: "active",
    icon: "bell",
    bundleUrl: "/specs/qeet-notify.yaml",
    environments: envs(8080),
    authentication: {
      label: "API key",
      header: "X-Qeet-Api-Key",
      schemes: ["ApiKeyAuth"],
    },
    tryIt: true,
    postman: "/postman/qeet-notify.postman_collection.json",
    sdk: [
      {
        packageName: "@qeet-notify/node",
        registry: "npm",
        published: false,
        platform: "Node.js",
        repo: "https://github.com/qeetgroup/qeet-notify-node",
      },
      {
        packageName: "@qeet-notify/react",
        registry: "npm",
        published: false,
        platform: "React",
        repo: "https://github.com/qeetgroup/qeet-notify-react",
      },
    ],
    specs: [
      {
        slug: "qeet-notify-messaging",
        title: "Messaging",
        url: "/specs/qeet-notify/messaging.yaml",
        blurb: "Events, notifications, templates, workflows and delivery experiments.",
      },
      {
        slug: "qeet-notify-subscribers",
        title: "Subscribers",
        url: "/specs/qeet-notify/subscribers.yaml",
        blurb: "Subscriber records, consent and registered devices.",
      },
      {
        slug: "qeet-notify-deliverability",
        title: "Deliverability",
        url: "/specs/qeet-notify/deliverability.yaml",
        blurb: "Providers, suppressions, dead letters, inbound mail, IP warmup and DLT/NDNC.",
      },
      {
        slug: "qeet-notify-operations",
        title: "Operations",
        url: "/specs/qeet-notify/operations.yaml",
        blurb: "Health, analytics, API keys, audit, billing, environments and broadcasts.",
      },
    ],
  },
  {
    id: "qeet-pay",
    name: "Qeet Pay",
    kind: "Payments",
    description:
      "India-first payments, billing and GST infrastructure (UPI / Cards / NACH). Money is always in integer minor units (paise).",
    version: "v1",
    // Portfolio status is `development` (qeet-context/PRODUCT-PORTFOLIO.md), so
    // the UI shows an "In development" badge. The spec is published and complete
    // enough to document; its operations carry no prose yet (tracked upstream in
    // qeet-pay-server — see scripts/validate-specs.mjs warnings).
    lifecycle: "development",
    icon: "credit-card",
    bundleUrl: "/specs/qeet-pay.yaml",
    environments: envs(4201),
    authentication: {
      label: "API key",
      header: "X-Api-Key",
      schemes: ["ApiKeyAuth"],
    },
    tryIt: true,
    postman: "/postman/qeet-pay.postman_collection.json",
    sdk: [
      {
        packageName: "@qeet-pay/node",
        registry: "npm",
        published: false,
        platform: "Node.js",
        repo: "https://github.com/qeetgroup/qeet-pay-node",
      },
      {
        packageName: "@qeet-pay/react",
        registry: "npm",
        published: false,
        platform: "React",
        repo: "https://github.com/qeetgroup/qeet-pay-react",
      },
    ],
    specs: [
      {
        slug: "qeet-pay-payments",
        title: "Payments",
        url: "/specs/qeet-pay/payments.yaml",
        blurb: "Payments, payment links, checkout, mandates, virtual accounts, orchestration.",
      },
      {
        slug: "qeet-pay-payouts",
        title: "Payouts & Money",
        url: "/specs/qeet-pay/payouts.yaml",
        blurb: "Payouts, ledger, treasury and reconciliation.",
      },
      {
        slug: "qeet-pay-billing",
        title: "Billing",
        url: "/specs/qeet-pay/billing.yaml",
        blurb: "Subscription billing, dunning and revenue recognition.",
      },
      {
        slug: "qeet-pay-tax",
        title: "GST & Tax",
        url: "/specs/qeet-pay/tax.yaml",
        blurb: "GST invoicing, e-invoicing (IRN), returns, input tax credit and TDS/TCS.",
      },
      {
        slug: "qeet-pay-commerce",
        title: "Commerce & Embedded Finance",
        url: "/specs/qeet-pay/commerce.yaml",
        blurb: "Marketplace, ONDC, cross-border, lending, BNPL, cards, insurance, escrow.",
      },
      {
        slug: "qeet-pay-risk",
        title: "Risk & Compliance",
        url: "/specs/qeet-pay/risk.yaml",
        blurb: "KYB, customer KYC, AML and fraud decisioning.",
      },
      {
        slug: "qeet-pay-platform",
        title: "Platform",
        url: "/specs/qeet-pay/platform.yaml",
        blurb: "Merchants, webhooks, analytics, accounting, messaging and agentic mandates.",
      },
    ],
  },
];

/** Lookup by Scalar document slug. */
export const productById = (id: string): ProductConfig | undefined =>
  PRODUCTS.find((p) => p.id === id);

/** The Scalar `sources` array — one document per product, in display order. */
export const SCALAR_SOURCES = PRODUCTS.map((p) => ({
  slug: p.id,
  title: p.name,
  url: p.bundleUrl,
}));

/** Every individual spec across all products (catalog cards + downloads). */
export const ALL_SPECS = PRODUCTS.flatMap((p) =>
  p.specs.map((s) => ({ ...s, product: p.name, productId: p.id })),
);
