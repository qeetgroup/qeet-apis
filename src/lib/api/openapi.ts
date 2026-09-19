/** Minimal OpenAPI reading helpers.
 *
 * Deliberately not a full parser: the vendored documents are already validated
 * by scripts/validate-specs.mjs (no external $refs, no duplicate operationIds,
 * every tag grouped), so navigation only needs to walk `paths` and `x-tagGroups`.
 * Everything here runs at build time in Astro's SSG pass — no client JS.
 */

export const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
}

export interface OpenApiTag {
  name: string;
  description?: string;
}

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  security?: Array<Record<string, string[]>>;
  tags?: OpenApiTag[];
  "x-tagGroups"?: Array<{ name: string; tags: string[] }>;
  paths?: Record<string, Record<string, OpenApiOperation> | undefined>;
  components?: { securitySchemes?: Record<string, unknown> };
}

export interface ResolvedOperation {
  method: Uppercase<HttpMethod>;
  path: string;
  operationId?: string;
  summary?: string;
  tag?: string;
  deprecated: boolean;
  /** True when the operation itself requires auth, or inherits a document-level
   *  requirement and does not opt out with `security: []`. */
  requiresAuth: boolean;
}

/** Every operation in document order, flattened. */
export function listOperations(doc: OpenApiDocument): ResolvedOperation[] {
  const documentRequiresAuth = (doc.security ?? []).length > 0;
  const out: ResolvedOperation[] = [];

  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    if (!item) continue;
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;
      out.push({
        method: method.toUpperCase() as Uppercase<HttpMethod>,
        path,
        operationId: op.operationId,
        summary: op.summary,
        tag: op.tags?.[0],
        deprecated: op.deprecated === true,
        requiresAuth: op.security ? op.security.length > 0 : documentRequiresAuth,
      });
    }
  }
  return out;
}

/**
 * Slug rules — these mirror Scalar's **defaults**, verified against the
 * rendered DOM.
 *
 * Originally these were handed to Scalar as `generateTagSlug` /
 * `generateOperationSlug`. That does not work here: `@scalar/astro` in
 * `renderMode="client"` passes the configuration as an Astro prop, which is
 * JSON-serialized, so function values are silently dropped. (Function
 * serialization only exists on the `static` path, which is the one that injects
 * a nested `<!doctype html>` — so it is not an option.)
 *
 * Mirroring Scalar's defaults is the better trade anyway: one less moving part,
 * and anchors keep working even if this config is ever bypassed. Change these
 * and you must change scripts/build-catalog.mjs to match.
 */
export function tagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Scalar's default operation slug: the upper-case method, then the raw path
 * with its slashes intact — e.g. `POST/v1/auth/login`.
 */
export function operationSlug(method: string, path: string): string {
  return `${method.toUpperCase()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The full anchor Scalar renders for a tag section.
 *
 * Verified against the runtime bundle, which composes tag ids as
 * `${documentSlug}/tag/${generateTagSlug(tag)}` — a bare tag slug does not
 * resolve, which is why the sidebar has to build the whole path.
 */
export function tagAnchor(productId: string, tagName: string): string {
  return `${productId}/tag/${tagSlug(tagName)}`;
}

/**
 * The full anchor Scalar renders for an operation:
 * `${tagAnchor}/${generateOperationSlug({ path, operationId, method, summary })}`.
 *
 * Operations with no tag hang off the document slug instead.
 */
export function operationAnchor(
  productId: string,
  tagName: string | undefined,
  method: string,
  path: string,
): string {
  const parent = tagName ? tagAnchor(productId, tagName) : productId;
  return `${parent}/${operationSlug(method, path)}`;
}
