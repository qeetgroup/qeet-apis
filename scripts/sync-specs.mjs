// Vendors each product's OpenAPI spec into public/specs/<product>/ and rewrites
// its `servers:` block to the canonical local / staging / prod hosts (per
// qeet-files/DOMAIN-ARCHITECTURE.md). Run locally with `pnpm sync` whenever a
// source spec changes — the vendored copies are committed and used at build,
// so CI/Vercel never needs the sibling repos.
//
// It also produces:
//   • public/specs/qeet-id.yaml — the 5 Qeet ID specs MERGED into one document
//     with `x-tagGroups`, so the Scalar reference shows a Postman-collection-style
//     folder sidebar (one folder per product area → tags → operations).
//   • a light `x-tagGroups` on the vendored Qeet Notify spec.
//   • public/postman/ — the vendored qeet-id Postman collection (+ environment).
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// One entry per product. `servers` is prod → staging → local (Scalar defaults
// to the first; readers switch env via the Servers dropdown).
const PRODUCTS = [
  {
    slug: "qeet-id",
    srcDir: "../qeet-servers/qeet-id-server/api/openapi",
    specs: ["auth", "management", "federation", "developer", "operations"],
    servers: [
      { url: "https://api.id.qeet.in", description: "Production" },
      { url: "https://api.id.staging.qeet.in", description: "Staging" },
      { url: "http://localhost:4001", description: "Local (docker compose)" },
    ],
  },
  {
    slug: "qeet-notify",
    srcDir: "../qeet-servers/qeet-notify-server/api/openapi",
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
  {
    slug: "qeet-pay",
    srcDir: "../qeet-pay/api/openapi",
    specs: ["v1"],
    servers: [
      { url: "https://api.pay.qeet.in", description: "Production" },
      { url: "https://api.pay.staging.qeet.in", description: "Staging" },
      { url: "http://localhost:4201", description: "Local (docker compose)" },
    ],
  },
];

// Qeet ID bundle: each source spec becomes one sidebar folder (an x-tagGroup),
// in this order. The folder's tags are derived from the spec's own tags.
const QEET_ID_GROUPS = [
  { spec: "auth", name: "Authentication & Access" },
  { spec: "management", name: "Identity Management" },
  { spec: "federation", name: "Federation" },
  { spec: "developer", name: "Developer" },
  { spec: "operations", name: "Operations" },
];

const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

let synced = 0;
let missing = 0;
const loaded = {}; // slug -> { name -> parsed doc (servers rewritten) }

for (const product of PRODUCTS) {
  const outDir = join(root, "public/specs", product.slug);
  mkdirSync(outDir, { recursive: true });
  loaded[product.slug] = {};
  for (const name of product.specs) {
    const srcPath = join(root, product.srcDir, `${name}.yaml`);
    if (!existsSync(srcPath)) {
      console.warn(`[sync] MISSING ${product.srcDir}/${name}.yaml — skipped (sibling repo not present?)`);
      missing++;
      continue;
    }
    const doc = yaml.load(readFileSync(srcPath, "utf8"));
    doc.servers = product.servers;

    // Give Qeet Notify a single folder so it renders grouped too.
    if (product.slug === "qeet-notify") {
      const names = collectTagNames(doc);
      doc.tags = names.map((n) => ({ name: n }));
      doc["x-tagGroups"] = [{ name: "Notifications", tags: names }];
    }

    const out = yaml.dump(doc, { lineWidth: -1, noRefs: true });
    writeFileSync(join(outDir, `${name}.yaml`), out);
    loaded[product.slug][name] = doc;
    console.log(`[sync] ${product.slug}/${name}.yaml  (${product.servers.length} envs)`);
    synced++;
  }
}

// ---- Qeet ID bundle (merged doc + x-tagGroups) -----------------------------
const idDocs = loaded["qeet-id"] || {};
if (QEET_ID_GROUPS.every((g) => idDocs[g.spec])) {
  const merged = {
    openapi: "3.1.0",
    info: {
      title: "Qeet ID API",
      version: idDocs.auth.info?.version ?? "0.2.0",
      description:
        "The complete Qeet ID identity platform — authentication & access, identity management, federation, developer tooling and operations — in one reference.",
    },
    servers: PRODUCTS.find((p) => p.slug === "qeet-id").servers,
    tags: [],
    "x-tagGroups": [],
    paths: {},
    components: {},
  };

  const tagSeen = new Set();
  const addTag = (t) => {
    if (!t || !t.name || tagSeen.has(t.name)) return;
    tagSeen.add(t.name);
    merged.tags.push(t);
  };

  for (const group of QEET_ID_GROUPS) {
    const doc = idDocs[group.spec];

    // paths — assert no path+method collision across slices.
    for (const [p, item] of Object.entries(doc.paths ?? {})) {
      if (!merged.paths[p]) {
        merged.paths[p] = item;
      } else {
        for (const m of HTTP_METHODS) {
          if (item[m] && merged.paths[p][m]) {
            console.warn(`[bundle] collision: ${m.toUpperCase()} ${p} defined twice — keeping first`);
          } else if (item[m]) {
            merged.paths[p][m] = item[m];
          }
        }
      }
    }

    // components — union every subsection by name; warn on differing dupes.
    for (const [section, entries] of Object.entries(doc.components ?? {})) {
      merged.components[section] ??= {};
      for (const [key, val] of Object.entries(entries)) {
        const existing = merged.components[section][key];
        if (existing === undefined) {
          merged.components[section][key] = val;
        } else if (JSON.stringify(existing) !== JSON.stringify(val)) {
          console.warn(`[bundle] components.${section}.${key} differs between specs — keeping first`);
        }
      }
    }

    // tags — declared tags first (with descriptions), then any operation-only tags.
    const declared = (doc.tags ?? []).map((t) => t.name);
    for (const t of doc.tags ?? []) addTag(t);
    const groupTags = [...declared];
    for (const name of collectTagNames(doc)) {
      if (!groupTags.includes(name)) {
        groupTags.push(name);
        addTag({ name });
      }
    }
    merged["x-tagGroups"].push({ name: group.name, tags: groupTags });
  }

  // sanity: every operation tag should land in exactly one group.
  const grouped = new Set(merged["x-tagGroups"].flatMap((g) => g.tags));
  for (const name of tagSeen) {
    if (!grouped.has(name)) console.warn(`[bundle] tag "${name}" is not in any x-tagGroup`);
  }

  writeFileSync(
    join(root, "public/specs/qeet-id.yaml"),
    yaml.dump(merged, { lineWidth: -1, noRefs: true }),
  );
  console.log(
    `[bundle] qeet-id.yaml  (${Object.keys(merged.paths).length} paths, ${merged.tags.length} tags, ${merged["x-tagGroups"].length} folders)`,
  );
} else {
  console.warn("[bundle] skipped qeet-id.yaml — not all source specs are present.");
}

// ---- Postman collection ----------------------------------------------------
const postmanOut = join(root, "public/postman");
mkdirSync(postmanOut, { recursive: true });
// One entry per product that ships a hand-maintained Postman collection + environment.
const POSTMAN = [
  {
    srcDir: "../qeet-servers/qeet-id-server/api/postman",
    files: ["qeet-id.postman_collection.json", "qeet-id.postman_environment.json"],
  },
  {
    srcDir: "../qeet-pay/api/postman",
    files: ["qeet-pay.postman_collection.json", "qeet-pay.postman_environment.json"],
  },
];
for (const { srcDir, files } of POSTMAN) {
  for (const f of files) {
    const src = join(root, srcDir, f);
    if (existsSync(src)) {
      copyFileSync(src, join(postmanOut, f));
      console.log(`[postman] ${f}`);
    } else {
      console.warn(`[postman] MISSING ${f} — skipped (sibling repo not present?)`);
    }
  }
}

console.log(`\n[sync] done — ${synced} spec(s) vendored${missing ? `, ${missing} missing` : ""}.`);

// Collects every tag referenced by a spec's operations, in first-seen order.
function collectTagNames(doc) {
  const names = [];
  for (const item of Object.values(doc.paths ?? {})) {
    for (const m of HTTP_METHODS) {
      for (const t of item?.[m]?.tags ?? []) {
        if (!names.includes(t)) names.push(t);
      }
    }
  }
  return names;
}
