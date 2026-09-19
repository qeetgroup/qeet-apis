// Vendors every product's OpenAPI specs into public/specs/ and rewrites their
// `servers:` block to the canonical hosts. Run locally with `bun run sync`
// whenever a source spec changes — the vendored copies are committed and used at
// build time, so CI/Vercel never needs the sibling repos.
//
// Per product it produces:
//   • public/specs/<slug>/<name>.yaml — one vendored copy per source spec,
//     self-consistent (every tag an operation uses is also declared).
//   • public/specs/<slug>.yaml — all of that product's specs MERGED into one
//     document with `x-tagGroups`, one folder per source spec. This is what the
//     Scalar reference renders, and what gives it a folder sidebar.
//   • public/postman/ — the vendored collection + environment, with hosts
//     rewritten to production (the upstream environments point at localhost).
//
// Hosts follow the organization domain standard (qeet-context/DOMAIN.md, which
// supersedes the older qeet-files/DOMAIN-ARCHITECTURE.md this script used to
// cite): production is `api.<product>.qeet.in` with no environment label.
//
// Exits non-zero if any source spec is missing, so a half-synced tree can't be
// committed silently.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

// One entry per product.
//   servers — production → staging → local. The portal only *publishes* the
//     production entry (see src/config/environments.ts); the rest are kept here
//     so an internal build can surface them.
//   groups  — each source spec becomes one sidebar folder, in this order. A
//     folder's tags are the tags that spec's operations actually use.
const PRODUCTS = [
  {
    slug: "qeet-id",
    title: "Qeet ID API",
    description:
      "The complete Qeet ID identity platform — authentication & access, identity management, federation, developer tooling and operations — in one reference.",
    srcDir: "../qeet-id/qeet-id-server/api/openapi",
    servers: [
      { url: "https://api.id.qeet.in", description: "Production" },
      { url: "https://api.id.staging.qeet.in", description: "Staging" },
      { url: "http://localhost:4001", description: "Local (docker compose)" },
    ],
    groups: [
      { spec: "auth", name: "Authentication & Access" },
      { spec: "management", name: "Identity Management" },
      { spec: "federation", name: "Federation" },
      { spec: "developer", name: "Developer" },
      { spec: "operations", name: "Operations" },
    ],
    postman: {
      srcDir: "../qeet-id/qeet-id-server/api/postman",
      collection: "qeet-id.postman_collection.json",
      environment: "qeet-id.postman_environment.json",
    },
  },
  {
    slug: "qeet-notify",
    title: "Qeet Notify API",
    description:
      "Multi-channel transactional notifications — messaging and templates, subscribers and consent, deliverability, and platform operations.",
    srcDir: "../qeet-notify/qeet-notify-server/api/openapi",
    // NOTE: the source spec/Caddyfile use the non-standard `notify.api.qeet.in`.
    // We publish the standard `api.notify.qeet.in`; reconciling the running
    // service is a DNS/deploy change, so it is flagged upstream, not fixed here.
    servers: [
      { url: "https://api.notify.qeet.in", description: "Production" },
      { url: "https://api.notify.staging.qeet.in", description: "Staging" },
      { url: "http://localhost:8080", description: "Local" },
    ],
    groups: [
      { spec: "messaging", name: "Messaging" },
      { spec: "subscribers", name: "Subscribers" },
      { spec: "deliverability", name: "Deliverability" },
      { spec: "operations", name: "Operations" },
    ],
    postman: {
      srcDir: "../qeet-notify/qeet-notify-server/api/postman",
      collection: "qeet-notify.postman_collection.json",
      environment: "qeet-notify.postman_environment.json",
    },
  },
  {
    slug: "qeet-pay",
    title: "Qeet Pay API",
    description:
      "India-first payments, billing and GST infrastructure (UPI / Cards / NACH) — payments and payouts, billing, tax, risk, embedded finance and platform APIs. Money is always in integer minor units (paise).",
    srcDir: "../qeet-pay/qeet-pay-server/api/openapi",
    servers: [
      { url: "https://api.pay.qeet.in", description: "Production" },
      { url: "https://api.pay.staging.qeet.in", description: "Staging" },
      { url: "http://localhost:4201", description: "Local (docker compose)" },
    ],
    groups: [
      { spec: "payments", name: "Payments" },
      { spec: "payouts", name: "Payouts & Money" },
      { spec: "billing", name: "Billing" },
      { spec: "tax", name: "GST & Tax" },
      { spec: "commerce", name: "Commerce & Embedded Finance" },
      { spec: "risk", name: "Risk & Compliance" },
      { spec: "platform", name: "Platform" },
    ],
    postman: {
      srcDir: "../qeet-pay/qeet-pay-server/api/postman",
      collection: "qeet-pay.postman_collection.json",
      environment: "qeet-pay.postman_environment.json",
    },
  },
];

/**
 * Readable, standard names for the auth types.
 *
 * Scalar's "Auth Type" selector shows the raw `components.securitySchemes`
 * key, so readers were choosing between `bearerAuth`, `apiKeyAuth`,
 * `scimBearer`, `clientCredentials` and `ssoCookie` — implementation
 * identifiers, not a vocabulary anyone recognises.
 *
 * Renamed to the industry-standard name for each mechanism. Hyphenated
 * Title-Case keeps the document valid: OpenAPI restricts component keys to
 * `[a-zA-Z0-9._-]`, so spaces are not an option. Every `security` reference —
 * document-level and per-operation — is rewritten to match.
 */
const SECURITY_SCHEME_NAMES = {
  apiKeyAuth: "API-Key",
  ApiKeyAuth: "API-Key",
  bearerAuth: "Bearer-Token",
  clientCredentials: "OAuth2-Client-Credentials",
  scimBearer: "SCIM-Token",
  ssoCookie: "Session-Cookie",
  adminPortalLink: "Admin-Portal-Link",
  adminPortalCookie: "Admin-Portal-Cookie",
};

/**
 * Display order, most-used first, so the selector opens on what a developer
 * actually holds rather than on an internal one-time credential.
 */
const SECURITY_SCHEME_ORDER = [
  "API-Key",
  "Bearer-Token",
  "OAuth2-Client-Credentials",
  "SCIM-Token",
  "Session-Cookie",
  "Admin-Portal-Link",
  "Admin-Portal-Cookie",
];

/** Renames securitySchemes and every reference to them, in place. */
function renameSecuritySchemes(doc) {
  const schemes = doc.components?.securitySchemes;
  if (!schemes) return;

  const renamed = {};
  for (const [key, value] of Object.entries(schemes)) {
    renamed[SECURITY_SCHEME_NAMES[key] ?? key] = value;
  }

  // Emit in the preferred order, then anything unmapped, so the selector is
  // deterministic across syncs.
  const ordered = {};
  for (const name of SECURITY_SCHEME_ORDER) {
    if (name in renamed) ordered[name] = renamed[name];
  }
  for (const [name, value] of Object.entries(renamed)) {
    if (!(name in ordered)) ordered[name] = value;
  }
  doc.components.securitySchemes = ordered;

  const rewrite = (requirements) =>
    requirements?.map((requirement) =>
      Object.fromEntries(
        Object.entries(requirement).map(([key, scopes]) => [
          SECURITY_SCHEME_NAMES[key] ?? key,
          scopes,
        ]),
      ),
    );

  if (Array.isArray(doc.security)) doc.security = rewrite(doc.security);
  for (const item of Object.values(doc.paths ?? {})) {
    for (const m of HTTP_METHODS) {
      const op = item?.[m];
      if (Array.isArray(op?.security)) op.security = rewrite(op.security);
    }
  }
}

let missing = 0;
let synced = 0;
const renames = new Map();

/** Every tag an operation references, in first-seen order. */
function usedTagNames(doc) {
  const names = [];
  for (const item of Object.values(doc.paths ?? {})) {
    for (const m of HTTP_METHODS) {
      for (const t of item?.[m]?.tags ?? []) if (!names.includes(t)) names.push(t);
    }
  }
  return names;
}

/**
 * Strips framework artifacts out of a tag name. Springdoc names an untagged
 * controller after its class (`offline-controller`), which would otherwise leak
 * an implementation detail into the public sidebar. This only removes the
 * suffix and title-cases the remainder — it never invents meaning.
 */
function normalizeTagName(name) {
  if (typeof name !== "string") return name;
  const m = /^([a-z0-9]+(?:-[a-z0-9]+)*)-(?:controller|resource|api)$/.exec(name.trim());
  if (!m) return name;
  const clean = m[1]
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  if (clean !== name) renames.set(name, clean);
  return clean;
}

/** Rewrites tag names in place, across declarations and operations. */
function normalizeTags(doc) {
  for (const t of doc.tags ?? []) if (t?.name) t.name = normalizeTagName(t.name);
  for (const item of Object.values(doc.paths ?? {})) {
    for (const m of HTTP_METHODS) {
      const op = item?.[m];
      if (Array.isArray(op?.tags)) op.tags = op.tags.map(normalizeTagName);
    }
  }
}

/**
 * Makes a document self-consistent: any tag used by an operation but never
 * declared gets a bare declaration, so the file stands on its own when served
 * standalone (and so validate-specs passes). Declaring metadata a document
 * already references is normalization, not an API-contract change.
 */
function declareUsedTags(doc, label) {
  const declared = new Map((doc.tags ?? []).map((t) => [t.name, t]));
  const added = [];
  for (const name of usedTagNames(doc)) {
    if (!declared.has(name)) {
      added.push(name);
      declared.set(name, { name });
    }
  }
  // Keep only tags that are actually used — Qeet Pay's specs each declare the
  // whole ~40-tag union, which would otherwise render 40 empty sidebar folders.
  const used = new Set(usedTagNames(doc));
  doc.tags = [...declared.values()].filter((t) => used.has(t.name));
  if (added.length) {
    console.log(`[tags]  ${label}: declared ${added.length} used-but-undeclared tag(s): ${added.join(", ")}`);
  }
  return doc.tags;
}

const dump = (doc) => yaml.dump(doc, { lineWidth: -1, noRefs: true });

// ---- vendor each product's specs -------------------------------------------
const loaded = {}; // slug -> { specName -> parsed doc }

for (const product of PRODUCTS) {
  const outDir = join(root, "public/specs", product.slug);
  mkdirSync(outDir, { recursive: true });
  loaded[product.slug] = {};

  for (const { spec } of product.groups) {
    const srcPath = join(root, product.srcDir, `${spec}.yaml`);
    if (!existsSync(srcPath)) {
      console.error(`[sync] MISSING ${product.srcDir}/${spec}.yaml`);
      missing++;
      continue;
    }
    const doc = yaml.load(readFileSync(srcPath, "utf8"));
    doc.servers = product.servers;
    normalizeTags(doc);
    declareUsedTags(doc, `${product.slug}/${spec}`);
    renameSecuritySchemes(doc);

    writeFileSync(join(outDir, `${spec}.yaml`), dump(doc));
    loaded[product.slug][spec] = doc;
    console.log(`[sync]  ${product.slug}/${spec}.yaml`);
    synced++;
  }
}

// ---- bundle each product into one document with x-tagGroups -----------------
for (const product of PRODUCTS) {
  const docs = loaded[product.slug] ?? {};
  const present = product.groups.filter((g) => docs[g.spec]);
  if (present.length !== product.groups.length) {
    console.error(`[bundle] SKIPPED ${product.slug}.yaml — ${product.groups.length - present.length} source spec(s) missing.`);
    continue;
  }

  const first = docs[product.groups[0].spec];
  const merged = {
    openapi: first.openapi ?? "3.1.0",
    info: {
      title: product.title,
      version: first.info?.version ?? "0.0.0",
      description: product.description,
      ...(first.info?.contact ? { contact: first.info.contact } : {}),
      ...(first.info?.license ? { license: first.info.license } : {}),
    },
    servers: product.servers,
    ...(first.security ? { security: first.security } : {}),
    tags: [],
    "x-tagGroups": [],
    paths: {},
    components: {},
  };

  const tagSeen = new Map(); // name -> declaration (first wins)
  const claimed = new Map(); // name -> group that owns it
  const opIdOwner = new Map(); // operationId -> "METHOD /path" that holds it
  const opIdFixes = [];

  /**
   * `operationId` must be unique across a document. Springdoc names operations
   * per controller (`get`, `get_1`, `create_2`), which is unique inside each
   * source file but collides once several are merged — Qeet Pay produced 69
   * such collisions. Disambiguate by prefixing with the source spec, and only
   * for the ones that actually clash, so meaningful upstream ids survive
   * untouched. The vendored split files keep their original ids.
   */
  const dedupeOperationId = (op, spec, method, path) => {
    if (!op?.operationId) return;
    const original = op.operationId;
    if (!opIdOwner.has(original)) {
      opIdOwner.set(original, `${method} ${path}`);
      return;
    }
    let candidate = `${spec}_${original}`;
    let n = 2;
    while (opIdOwner.has(candidate)) candidate = `${spec}_${original}_${n++}`;
    op.operationId = candidate;
    opIdOwner.set(candidate, `${method} ${path}`);
    opIdFixes.push(`${original} → ${candidate}`);
  };

  for (const group of product.groups) {
    // Clone so renaming an operationId for the bundle can never mutate the
    // vendored split document we already wrote.
    const doc = structuredClone(docs[group.spec]);

    for (const [p, item] of Object.entries(doc.paths ?? {})) {
      for (const m of HTTP_METHODS) {
        if (item[m]) dedupeOperationId(item[m], group.spec, m.toUpperCase(), p);
      }
    }

    // paths — first writer wins a whole path item, then merge method by method.
    for (const [p, item] of Object.entries(doc.paths ?? {})) {
      if (!merged.paths[p]) {
        merged.paths[p] = item;
        continue;
      }
      for (const m of HTTP_METHODS) {
        if (item[m] && merged.paths[p][m]) {
          console.warn(`[bundle] ${product.slug}: collision ${m.toUpperCase()} ${p} — keeping first`);
        } else if (item[m]) {
          merged.paths[p][m] = item[m];
        }
      }
    }

    // components — union by key; warn when the same key differs between specs.
    for (const [section, entries] of Object.entries(doc.components ?? {})) {
      merged.components[section] ??= {};
      for (const [key, val] of Object.entries(entries ?? {})) {
        const existing = merged.components[section][key];
        if (existing === undefined) {
          merged.components[section][key] = val;
        } else if (JSON.stringify(existing) !== JSON.stringify(val)) {
          console.warn(`[bundle] ${product.slug}: components.${section}.${key} differs between specs — keeping first`);
        }
      }
    }

    // tags — a folder claims the tags its own operations use. A tag shared by
    // two specs (e.g. Notify's "Public") belongs to the first folder that
    // claims it, because x-tagGroups must partition the tag set.
    const declaredHere = new Map((doc.tags ?? []).map((t) => [t.name, t]));
    const groupTags = [];
    for (const name of usedTagNames(doc)) {
      if (claimed.has(name)) {
        if (claimed.get(name) !== group.name) {
          console.log(`[bundle] ${product.slug}: tag "${name}" also used by "${group.name}" — kept in "${claimed.get(name)}"`);
        }
        continue;
      }
      claimed.set(name, group.name);
      groupTags.push(name);
      if (!tagSeen.has(name)) tagSeen.set(name, declaredHere.get(name) ?? { name });
    }
    // Carry descriptions across even when another folder claimed the tag first.
    for (const [name, decl] of declaredHere) {
      const existing = tagSeen.get(name);
      if (existing && !existing.description && decl.description) existing.description = decl.description;
    }
    if (groupTags.length) merged["x-tagGroups"].push({ name: group.name, tags: groupTags });
  }

  // Emit tags in x-tagGroups order so the sidebar and the tag list agree.
  merged.tags = merged["x-tagGroups"].flatMap((g) => g.tags).map((n) => tagSeen.get(n));

  // Idempotent: the splits were already renamed, but this also orders the
  // merged scheme list and catches the bundle's own top-level `security`.
  renameSecuritySchemes(merged);

  if (opIdFixes.length) {
    console.log(
      `[bundle] ${product.slug}: disambiguated ${opIdFixes.length} colliding operationId(s) ` +
        `(e.g. ${opIdFixes.slice(0, 3).join(", ")}) — upstream should give these explicit ids`,
    );
  }

  writeFileSync(join(root, "public/specs", `${product.slug}.yaml`), dump(merged));
  const ops = Object.values(merged.paths).reduce(
    (n, item) => n + HTTP_METHODS.filter((m) => item[m]).length,
    0,
  );
  console.log(
    `[bundle] ${product.slug}.yaml  (${Object.keys(merged.paths).length} paths, ${ops} operations, ${merged.tags.length} tags, ${merged["x-tagGroups"].length} folders)`,
  );
}

// ---- Postman ---------------------------------------------------------------
// Parsed and rewritten rather than copied: the upstream environments point at
// localhost, and a public portal must not ship internal hosts (see O13/§12).
const postmanOut = join(root, "public/postman");
mkdirSync(postmanOut, { recursive: true });

for (const product of PRODUCTS) {
  const pm = product.postman;
  if (!pm) continue;
  const production = product.servers[0].url;

  for (const [kind, file] of [["collection", pm.collection], ["environment", pm.environment]]) {
    if (!file) continue;
    const src = join(root, pm.srcDir, file);
    if (!existsSync(src)) {
      console.error(`[postman] MISSING ${pm.srcDir}/${file}`);
      missing++;
      continue;
    }

    let json;
    try {
      json = JSON.parse(readFileSync(src, "utf8"));
    } catch (e) {
      console.error(`[postman] ${file} is not valid JSON: ${e.message}`);
      missing++;
      continue;
    }

    let rewritten = 0;
    let cleared = 0;
    for (const v of json.variable ?? json.values ?? []) {
      if (typeof v?.key !== "string") continue;
      if (/^(baseUrl|base_url|host|url)$/i.test(v.key)) {
        if (v.value !== production) {
          v.value = production;
          rewritten++;
        }
        continue;
      }
      // Any other variable still pointing at a developer machine is blanked
      // rather than guessed at: shipping `http://localhost:3002` in a public
      // environment is an internal-host leak, and inventing a production
      // equivalent we cannot verify would be worse. The key stays so the
      // collection still documents it.
      if (typeof v.value === "string" && /^https?:\/\/(localhost|127\.0\.0\.1)\b/.test(v.value)) {
        v.value = "";
        cleared++;
      }
    }
    if (kind === "environment" && typeof json.name === "string") {
      json.name = `${product.slug} (production)`;
    }

    writeFileSync(join(postmanOut, file), `${JSON.stringify(json, null, 2)}\n`);
    const notes = [
      rewritten ? `${rewritten} host var(s) → ${production}` : null,
      cleared ? `${cleared} localhost var(s) blanked` : null,
    ].filter(Boolean);
    console.log(`[postman] ${file}${notes.length ? ` (${notes.join(", ")})` : ""}`);
  }
}

// ---- summary ---------------------------------------------------------------
if (renames.size) {
  console.log(`\n[tags] normalized ${renames.size} framework-artifact tag name(s):`);
  for (const [from, to] of renames) console.log(`    "${from}" → "${to}"`);
  console.log("       (upstream should tag these operations explicitly)");
}

console.log(`\n[sync] done — ${synced} spec(s) vendored, ${PRODUCTS.length} bundle(s).`);

if (missing > 0) {
  console.error(
    `[sync] FAILED — ${missing} source file(s) missing. Are the sibling repos cloned next to this one?`,
  );
  process.exit(1);
}
