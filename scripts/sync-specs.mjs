// Vendors each product's OpenAPI spec into public/specs/<product>/ and rewrites
// its `servers:` block to the canonical local / staging / prod hosts (per
// qeet-files/DOMAIN-ARCHITECTURE.md). Run locally with `pnpm sync` whenever a
// source spec changes — the vendored copies are committed and used at build,
// so CI/Vercel never needs the sibling repos.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// One entry per product. `servers` is prod → staging → local (Swagger UI defaults
// to the first; readers switch env via the Servers dropdown).
const PRODUCTS = [
  {
    slug: "qeet-id",
    srcDir: "../qeet-id/api/openapi",
    specs: ["auth", "management", "federation", "developer", "operations"],
    servers: [
      { url: "https://api.id.qeet.in", description: "Production" },
      { url: "https://api.id.staging.qeet.in", description: "Staging" },
      { url: "http://localhost:4001", description: "Local (docker compose)" },
    ],
  },
  {
    slug: "qeet-notify",
    srcDir: "../qeet-notify/api/openapi",
    specs: ["v1"],
    // NOTE: the source spec/Caddyfile use the non-standard `notify.api.qeet.in`.
    // We use the DOMAIN-ARCHITECTURE standard `api.notify.qeet.in` here; the
    // qeet-notify repo should be reconciled to match (flagged, not fixed here).
    servers: [
      { url: "https://api.notify.qeet.in", description: "Production" },
      { url: "https://api.notify.staging.qeet.in", description: "Staging" },
      { url: "http://localhost:8080", description: "Local" },
    ],
  },
];

let synced = 0;
let missing = 0;
for (const product of PRODUCTS) {
  const outDir = join(root, "public/specs", product.slug);
  mkdirSync(outDir, { recursive: true });
  for (const name of product.specs) {
    const srcPath = join(root, product.srcDir, `${name}.yaml`);
    if (!existsSync(srcPath)) {
      console.warn(`[sync] MISSING ${product.srcDir}/${name}.yaml — skipped (sibling repo not present?)`);
      missing++;
      continue;
    }
    const doc = yaml.load(readFileSync(srcPath, "utf8"));
    doc.servers = product.servers;
    const out = yaml.dump(doc, { lineWidth: -1, noRefs: true });
    writeFileSync(join(outDir, `${name}.yaml`), out);
    console.log(`[sync] ${product.slug}/${name}.yaml  (${product.servers.length} envs)`);
    synced++;
  }
}
console.log(`\n[sync] done — ${synced} spec(s) vendored${missing ? `, ${missing} missing` : ""}.`);
