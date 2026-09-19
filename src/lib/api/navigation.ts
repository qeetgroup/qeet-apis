/** Builds the reference sidebar from the vendored OpenAPI documents.
 *
 * This is the heart of "Qeet owns navigation": the tree is derived at build
 * time from each product's `x-tagGroups` → tags → operations, so it is always
 * exactly the API surface and nothing is hand-maintained. The requested
 * taxonomy (§10) was already ~90% present in the specs, which is why none of it
 * is invented here — inventing resources would make the sidebar lie.
 *
 * Runs in Astro's SSG pass, reading from `public/specs/`. No client JS, no
 * runtime spec fetch for the navigation.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { PRODUCTS } from "../../config/products";
import type { ProductConfig } from "../../types/product";
import {
  listOperations,
  operationAnchor,
  tagAnchor,
  type OpenApiDocument,
  type ResolvedOperation,
} from "./openapi";

export interface NavOperation {
  method: string;
  path: string;
  summary?: string;
  /** Anchor within the reference, matching what Scalar emits. */
  slug: string;
  requiresAuth: boolean;
  deprecated: boolean;
}

export interface NavTag {
  name: string;
  description?: string;
  slug: string;
  operations: NavOperation[];
}

export interface NavGroup {
  name: string;
  tags: NavTag[];
  /** Total operations in the group, for the sidebar count. */
  operationCount: number;
}

export interface ProductNavigation {
  productId: string;
  productName: string;
  version: string;
  groups: NavGroup[];
  tagCount: number;
  operationCount: number;
}

/** Reads a vendored bundle from public/specs/. */
function loadBundle(product: ProductConfig): OpenApiDocument {
  const path = join(process.cwd(), "public", product.bundleUrl.replace(/^\/specs\//, "specs/"));
  return yaml.load(readFileSync(path, "utf8")) as OpenApiDocument;
}

function toNavOperation(productId: string, op: ResolvedOperation): NavOperation {
  return {
    method: op.method,
    path: op.path,
    // Qeet Pay's 273 operations have no summary (upstream debt tracked in
    // qeet-pay-server). Leave it undefined so the sidebar shows the path
    // rather than an invented title.
    summary: op.summary,
    slug: operationAnchor(productId, op.tag, op.method, op.path),
    requiresAuth: op.requiresAuth,
    deprecated: op.deprecated,
  };
}

/** The navigation tree for one product. */
export function buildProductNavigation(product: ProductConfig): ProductNavigation {
  const doc = loadBundle(product);
  const operations = listOperations(doc);

  const byTag = new Map<string, ResolvedOperation[]>();
  for (const op of operations) {
    const key = op.tag ?? "Other";
    const list = byTag.get(key);
    if (list) list.push(op);
    else byTag.set(key, [op]);
  }

  const descriptions = new Map((doc.tags ?? []).map((t) => [t.name, t.description]));

  const groups: NavGroup[] = [];
  for (const group of doc["x-tagGroups"] ?? []) {
    const tags: NavTag[] = [];
    for (const tagName of group.tags) {
      const ops = byTag.get(tagName);
      // A declared tag with no operations would render an empty folder.
      if (!ops || ops.length === 0) continue;
      tags.push({
        name: tagName,
        description: descriptions.get(tagName),
        slug: tagAnchor(product.id, tagName),
        operations: ops.map((op) => toNavOperation(product.id, op)),
      });
    }
    if (tags.length === 0) continue;
    groups.push({
      name: group.name,
      tags,
      operationCount: tags.reduce((n, t) => n + t.operations.length, 0),
    });
  }

  // Any tag the document groups missed still has to be reachable. validate-specs
  // treats an ungrouped tag as an ERROR, so this should stay empty — it exists
  // so a spec change can never silently hide endpoints.
  const grouped = new Set(groups.flatMap((g) => g.tags.map((t) => t.name)));
  const orphans = [...byTag.entries()].filter(([name]) => !grouped.has(name));
  if (orphans.length > 0) {
    groups.push({
      name: "Other",
      tags: orphans.map(([name, ops]) => ({
        name,
        description: descriptions.get(name),
        slug: tagAnchor(product.id, name),
        operations: ops.map((op) => toNavOperation(product.id, op)),
      })),
      operationCount: orphans.reduce((n, [, ops]) => n + ops.length, 0),
    });
  }

  return {
    productId: product.id,
    productName: product.name,
    version: doc.info?.version ?? product.version,
    groups,
    tagCount: groups.reduce((n, g) => n + g.tags.length, 0),
    operationCount: operations.length,
  };
}

/** Navigation for every product, in display order. */
export function buildAllNavigation(): ProductNavigation[] {
  return PRODUCTS.map(buildProductNavigation);
}
