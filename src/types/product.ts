import type { IconName } from "./icon";

/** Product + API metadata contracts for the developer platform.
 *
 * Everything the UI renders about a product flows from `ProductConfig` in
 * src/config/products.ts. The point is that adding a fourth product means
 * editing one array, not hunting through components — and that nothing about a
 * product can be asserted in the UI unless it exists in this type.
 *
 * Note the deliberately optional fields: `statusPage`, `sdk`, `postman`. A
 * missing value means "we have no such thing", and the UI must render nothing
 * rather than a placeholder (see O11 — never fabricate product status). */

/** Where a product sits in its lifecycle.
 *
 * This vocabulary is taken verbatim from the organization portfolio
 * (`qeet-context/PRODUCT-PORTFOLIO.md`) rather than invented for this portal.
 * Deliberately *not* "GA" / "beta": the portfolio records Qeet ID's GA status
 * as `unknown until reconciled` (DRIFT-REGISTER QC-007, because the org profile
 * and the server roadmap disagree), so asserting a GA badge here would be
 * fabricating product status. `active` renders no badge at all — a live API is
 * the baseline, not an announcement. */
export type Lifecycle = "active" | "development";

/** A server the reference can target.
 *
 * No `visibility` field: the portal offers one list to everyone. An earlier
 * version gated entries behind a public/internal build flag, which meant the
 * dropdown silently differed depending on how the app was started. */
export interface ApiEnvironment {
  /** Display name, e.g. "Local". */
  name: string;
  /** Absolute base URL. */
  url: string;
}

/** One OpenAPI document belonging to a product. */
export interface ProductSpec {
  /** Stable slug, also the catalog anchor. */
  slug: string;
  /** Area title, e.g. "Authentication & Access". */
  title: string;
  /** Served path of the vendored document. */
  url: string;
  /** One-line description for catalog cards. */
  blurb: string;
}

/** SDK availability.
 *
 * `published` is load-bearing and must be verified against the registry, not
 * assumed from the repo existing. As of 2026-09-19 all six Qeet SDK packages
 * return 404 from registry.npmjs.org — the source repos are real, the packages
 * are not released. The UI therefore shows a repository link and an explicit
 * "not yet published" state, and renders **no install command**, because a
 * copy-pasteable `npm i` that 404s is worse than no SDK section at all.
 *
 * Re-check with:
 *   curl -s -o /dev/null -w '%{http_code}' https://registry.npmjs.org/<pkg>
 */
export interface SdkAvailability {
  /** Intended package name, e.g. "@qeet-id/node". */
  packageName: string;
  /** Ecosystem the package targets. */
  registry: "npm";
  /** Whether the package actually resolves on the registry today. */
  published: boolean;
  /** Install line — only set once `published` is true. */
  install?: string;
  /** Source repository. */
  repo?: string;
  /** Language/runtime label for grouping, e.g. "Node.js", "React". */
  platform: string;
}

export interface ProductConfig {
  /** Scalar document slug + URL fragment, e.g. "qeet-id". */
  id: string;
  /** Display name, e.g. "Qeet ID". */
  name: string;
  /** Short category label, e.g. "Identity & Access". */
  kind: string;
  /** One-sentence description used in the switcher and product overview. */
  description: string;
  /** `info.version` of the product's bundled document. */
  version: string;
  /** Portfolio status — drives a badge only when not "active". */
  lifecycle: Lifecycle;
  /** Icon name (see components/shared/Icon.astro). */
  icon: IconName;

  /** The merged document the reference renders. */
  bundleUrl: string;
  /** The individual source documents, for the catalog + downloads. */
  specs: ProductSpec[];
  /** Servers offered in the reference, in display order. */
  environments: ApiEnvironment[];

  /** How callers authenticate, as documented in the spec's securitySchemes. */
  authentication: {
    /** Human label, e.g. "API key". */
    label: string;
    /** The header the API actually reads, e.g. "X-Api-Key". */
    header?: string;
    /** Scheme names declared in the OpenAPI document. */
    schemes: string[];
  };

  /** Whether Scalar's interactive request UI is offered for this product. */
  tryIt: boolean;

  /** Vendored Postman collection path, when one exists. */
  postman?: string;
  /** Official SDKs, when they exist. */
  sdk?: SdkAvailability[];
  /** Public status page, when one exists. Absent → render no Status link. */
  statusPage?: string;
  /** Product documentation site, when one exists. */
  docsUrl?: string;
}
