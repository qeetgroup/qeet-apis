// Builds public/search-index.json — the index behind the ⌘K palette.
//
// Qeet owns search outright (plan O3): Scalar's own search is disabled, so this
// one index has to cover everything a reader might look for. It is produced at
// build time from two sources that are already the truth:
//
//   1. src/pages/*.mdx      → guide pages and their headings
//   2. public/specs/*.yaml  → every tag and operation of every product
//
// No search service, no client-side indexing library — one static JSON file the
// palette fetches on first open.
//
// Run via `bun run sync` (or directly) and before `bun run build`.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

/** Mirrors src/config/products.ts. Kept minimal to avoid importing TS here. */
const PRODUCTS = [
  { id: "qeet-id", name: "Qeet ID" },
  { id: "qeet-notify", name: "Qeet Notify" },
  { id: "qeet-pay", name: "Qeet Pay" },
];

/**
 * Slugs must match what Scalar emits, because a search hit navigates to a
 * Scalar anchor. Both sides are pinned: src/config/scalar.ts passes these same
 * rules to Scalar via `generateTagSlug` / `generateOperationSlug`, and
 * src/lib/api/navigation.ts re-implements them for the sidebar.
 */
const slugifyTag = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Scalar's default: upper-case method + the raw path, e.g. `POST/v1/auth/login`. */
const slugifyOperation = (method, path) =>
  `${String(method).toUpperCase()}${String(path).startsWith("/") ? path : `/${path}`}`;

/**
 * Scalar composes anchors as `${document}/tag/${tagSlug}` and
 * `${tagAnchor}/${operationSlug}` (verified against the runtime bundle), so a
 * bare slug does not resolve. Mirrors tagAnchor/operationAnchor in
 * src/lib/api/openapi.ts.
 */
const tagAnchor = (productId, tagName) => `${productId}/tag/${slugifyTag(tagName)}`;
const operationAnchor = (productId, tagName, method, path) =>
  `${tagName ? tagAnchor(productId, tagName) : productId}/${slugifyOperation(method, path)}`;

/** Qeet ID is served at /reference; the others get their own page. */
const referenceHref = (productId) =>
  productId === PRODUCTS[0].id ? "/reference" : `/reference/${productId}`;

const entries = [];

// ---- 1. guide pages --------------------------------------------------------
const pagesDir = join(root, "src/pages");
for (const file of readdirSync(pagesDir)) {
  if (!file.endsWith(".mdx")) continue;
  const raw = readFileSync(join(pagesDir, file), "utf8");
  const route = `/${file.replace(/\.mdx$/, "")}`;

  const fm = /^---\n([\s\S]*?)\n---/.exec(raw);
  const front = fm ? fm[1] : "";
  const field = (key) => {
    const m = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(front);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
  };

  const title = field("title") ?? route;
  entries.push({
    kind: "guide",
    title,
    section: field("eyebrow"),
    description: field("description"),
    url: `${route}/`,
  });

  // ## / ### headings become deep links. Skip fenced code so a comment like
  // `# not a heading` inside a snippet doesn't become a search result.
  const body = raw.slice(fm ? fm[0].length : 0);
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const h = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!h) continue;
    const text = h[2].replace(/[`*_]/g, "").trim();
    entries.push({
      kind: "heading",
      title: text,
      section: title,
      url: `${route}/#${slugifyTag(text)}`,
    });
  }
}

// ---- 2. specs: tags + operations -------------------------------------------
for (const product of PRODUCTS) {
  const specPath = join(root, "public/specs", `${product.id}.yaml`);
  if (!existsSync(specPath)) {
    console.warn(`[catalog] missing ${product.id}.yaml — run \`bun run sync\` first`);
    continue;
  }
  const doc = yaml.load(readFileSync(specPath, "utf8"));

  for (const tag of doc.tags ?? []) {
    entries.push({
      kind: "tag",
      title: tag.name,
      section: product.name,
      description: tag.description,
      url: `${referenceHref(product.id)}#${tagAnchor(product.id, tag.name)}`,
    });
  }

  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = item?.[method];
      if (!op) continue;
      entries.push({
        kind: "operation",
        // Qeet Pay's operations carry no summary (upstream debt), so the path
        // is the title there. Never invent one.
        title: op.summary ?? path,
        section: product.name,
        method: method.toUpperCase(),
        path,
        tag: op.tags?.[0],
        url: `${referenceHref(product.id)}#${operationAnchor(product.id, op.tags?.[0], method, path)}`,
      });
    }
  }
}

const out = join(root, "public/search-index.json");
writeFileSync(out, `${JSON.stringify({ generatedAt: null, entries }, null, 0)}\n`);

const byKind = entries.reduce((acc, e) => {
  acc[e.kind] = (acc[e.kind] ?? 0) + 1;
  return acc;
}, {});
console.log(
  `[catalog] search-index.json — ${entries.length} entries (` +
    Object.entries(byKind)
      .map(([k, n]) => `${n} ${k}`)
      .join(", ") +
    ")",
);
