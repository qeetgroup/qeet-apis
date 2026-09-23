// Validates the vendored OpenAPI documents in public/specs/ — the portal's
// primary product. Run with `bun run validate:specs`; also runs in CI.
//
// Severity is deliberate (see the plan's O10): STRUCTURAL problems fail the
// build, DOCUMENTATION-QUALITY problems only report. Qeet Pay currently ships
// 169 operations with no summary/description — real upstream debt that belongs
// in qeet-pay-server, not a reason to keep CI permanently red here.
//
//   ERROR   → exit 1. Unparseable YAML, wrong/missing openapi version, broken
//             internal $ref, duplicate operationId, a tag used but never
//             declared, a declared tag missing from every x-tagGroup, a
//             malformed server URL, aggregate↔split drift.
//   WARNING → reported, exit 0. Missing summary/description/examples, bare
//             response descriptions, tags without descriptions.
//
// `--strict` promotes warnings to errors (useful locally, never in CI).
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const specsDir = join(root, "public", "specs");
const STRICT = process.argv.includes("--strict");

const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

/** Every .yaml under public/specs/, recursively. */
function findSpecs(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findSpecs(full));
    else if (entry.endsWith(".yaml") || entry.endsWith(".yml")) out.push(full);
  }
  return out;
}

/** Walk every node, yielding [pathString, value] for objects and arrays. */
function* walk(node, path = "") {
  if (node === null || typeof node !== "object") return;
  yield [path, node];
  for (const [k, v] of Object.entries(node)) {
    yield* walk(v, path ? `${path}.${k}` : k);
  }
}

/** Resolve a local JSON pointer (#/a/b) against the document. */
function resolvePointer(doc, ref) {
  const parts = ref.slice(2).split("/");
  let cur = doc;
  for (const raw of parts) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (cur === null || typeof cur !== "object" || !(key in cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

/** All operations as {method, path, op}. */
function operations(doc) {
  const out = [];
  for (const [p, item] of Object.entries(doc.paths ?? {})) {
    if (!item || typeof item !== "object") continue;
    for (const m of HTTP_METHODS) {
      if (item[m]) out.push({ method: m.toUpperCase(), path: p, op: item[m] });
    }
  }
  return out;
}

function validate(file, doc) {
  const rel = relative(root, file);

  // ---- structure -----------------------------------------------------------
  if (typeof doc?.openapi !== "string" || !doc.openapi.startsWith("3.")) {
    err(rel, `missing or unsupported "openapi" version (got ${JSON.stringify(doc?.openapi)})`);
    return;
  }
  if (!doc.info?.title) err(rel, "info.title is required");
  if (!doc.info?.version) err(rel, "info.version is required");
  if (!doc.paths || Object.keys(doc.paths).length === 0) err(rel, "document declares no paths");

  // ---- servers -------------------------------------------------------------
  if (!Array.isArray(doc.servers) || doc.servers.length === 0) {
    err(rel, "servers: must declare at least one entry");
  } else {
    for (const s of doc.servers) {
      if (!s?.url) {
        err(rel, "servers: entry is missing a url");
        continue;
      }
      // Template servers ({var}) are legal OpenAPI; skip URL parsing for them.
      if (s.url.includes("{")) continue;
      try {
        const u = new URL(s.url);
        if (u.protocol !== "https:" && u.hostname !== "localhost") {
          err(rel, `servers: ${s.url} must use https (only localhost may use http)`);
        }
      } catch {
        err(rel, `servers: ${s.url} is not a valid absolute URL`);
      }
      if (!s.description) warn(rel, `servers: ${s.url} has no description`);
    }
  }

  // ---- $refs ---------------------------------------------------------------
  for (const [path, node] of walk(doc)) {
    const ref = node?.$ref;
    if (typeof ref !== "string") continue;
    if (!ref.startsWith("#/")) {
      err(rel, `external $ref is not allowed (vendored specs must be self-contained): ${ref}`);
    } else if (resolvePointer(doc, ref) === undefined) {
      err(rel, `broken $ref at ${path || "<root>"}: ${ref}`);
    }
  }

  // ---- operationIds --------------------------------------------------------
  const ops = operations(doc);
  const seen = new Map();
  for (const { method, path, op } of ops) {
    if (!op.operationId) {
      err(rel, `${method} ${path} has no operationId`);
      continue;
    }
    if (seen.has(op.operationId)) {
      err(
        rel,
        `duplicate operationId "${op.operationId}" (${seen.get(op.operationId)} and ${method} ${path})`,
      );
    } else {
      seen.set(op.operationId, `${method} ${path}`);
    }
  }

  // ---- tags: declared, used, and grouped -----------------------------------
  const declared = new Map((doc.tags ?? []).map((t) => [t.name, t]));
  const used = new Set();
  for (const { method, path, op } of ops) {
    const tags = op.tags ?? [];
    if (tags.length === 0) warn(rel, `${method} ${path} has no tag`);
    for (const t of tags) used.add(t);
  }
  for (const t of used) {
    if (!declared.has(t)) {
      err(rel, `tag "${t}" is used by an operation but never declared in tags:`);
    }
  }
  for (const [name, tag] of declared) {
    if (!used.has(name)) warn(rel, `tag "${name}" is declared but no operation uses it`);
    if (!tag.description) warn(rel, `tag "${name}" has no description`);
  }

  // x-tagGroups must cover every declared tag, and reference only real tags.
  const groups = doc["x-tagGroups"];
  if (Array.isArray(groups)) {
    const grouped = new Set();
    for (const g of groups) {
      if (!g?.name) err(rel, "x-tagGroups: a group is missing a name");
      for (const t of g?.tags ?? []) {
        if (!declared.has(t))
          err(rel, `x-tagGroups: group "${g.name}" references undeclared tag "${t}"`);
        if (grouped.has(t)) err(rel, `x-tagGroups: tag "${t}" appears in more than one group`);
        grouped.add(t);
      }
    }
    for (const name of declared.keys()) {
      if (!grouped.has(name))
        err(rel, `tag "${name}" is not in any x-tagGroup (it would render ungrouped)`);
    }
  }

  // ---- security requirements reference declared schemes --------------------
  // A rename that missed a reference would silently drop the auth affordance
  // from an operation, so this is an ERROR.
  const schemes = new Set(Object.keys(doc.components?.securitySchemes ?? {}));
  const checkRequirements = (requirements, where) => {
    for (const requirement of requirements ?? []) {
      for (const name of Object.keys(requirement ?? {})) {
        if (!schemes.has(name)) {
          err(rel, `${where} requires security scheme "${name}", which is not declared`);
        }
      }
    }
  };
  checkRequirements(doc.security, "the document");
  for (const { method, path, op } of ops) {
    checkRequirements(op.security, `${method} ${path}`);
  }
  // Component keys are restricted to [a-zA-Z0-9._-]; a space would make the
  // document invalid for every other OpenAPI tool.
  for (const name of schemes) {
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      err(rel, `security scheme name "${name}" is not a valid component key`);
    }
  }

  // ---- documentation quality (warnings only) -------------------------------
  let noSummary = 0;
  let noDescription = 0;
  let bareResponse = 0;
  for (const { op } of ops) {
    if (!op.summary) noSummary++;
    if (!op.description) noDescription++;
    for (const r of Object.values(op.responses ?? {})) {
      const d = r?.description;
      if (!d || /^(ok|success|successful|default|response)$/i.test(d.trim())) bareResponse++;
    }
  }
  if (noSummary) warn(rel, `${noSummary}/${ops.length} operations have no summary`);
  if (noDescription) warn(rel, `${noDescription}/${ops.length} operations have no description`);
  if (bareResponse) warn(rel, `${bareResponse} responses have a bare/placeholder description`);

  return { ops, declared, groups };
}

/** The Qeet ID aggregate must stay a lossless merge of its 5 split specs. */
function checkAggregateParity(docs) {
  const aggPath = join(specsDir, "qeet-id.yaml");
  if (!existsSync(aggPath)) return;
  const agg = docs.get(aggPath);
  const splitDir = join(specsDir, "qeet-id");
  if (!agg || !existsSync(splitDir)) return;

  const splits = findSpecs(splitDir);
  if (splits.length === 0) return;

  const key = ({ method, path }) => `${method} ${path}`;
  const aggOps = new Set(operations(agg).map(key));
  const splitOps = new Map();
  for (const f of splits) {
    const d = docs.get(f);
    if (!d) continue;
    for (const o of operations(d)) {
      const k = key(o);
      if (splitOps.has(k)) {
        errors.push({
          file: "public/specs/qeet-id/",
          msg: `${k} is defined in both ${relative(specsDir, splitOps.get(k))} and ${relative(specsDir, f)}`,
        });
      }
      splitOps.set(k, f);
    }
  }

  const rel = "public/specs/qeet-id.yaml";
  for (const k of splitOps.keys()) {
    if (!aggOps.has(k))
      err(
        rel,
        `aggregate drift: ${k} exists in the split specs but not in the aggregate — re-run \`bun run sync\``,
      );
  }
  for (const k of aggOps) {
    if (!splitOps.has(k))
      err(
        rel,
        `aggregate drift: ${k} exists in the aggregate but in no split spec — re-run \`bun run sync\``,
      );
  }
  if (aggOps.size === splitOps.size && [...splitOps.keys()].every((k) => aggOps.has(k))) {
    console.log(`[parity] qeet-id.yaml matches its 5 split specs (${aggOps.size} operations)`);
  }
}

// ---- run --------------------------------------------------------------------
if (!existsSync(specsDir)) {
  console.error(`[validate] ${relative(root, specsDir)} does not exist`);
  process.exit(1);
}

const files = findSpecs(specsDir).sort();
if (files.length === 0) {
  console.error("[validate] no specs found — did `bun run sync` fail?");
  process.exit(1);
}

const docs = new Map();
for (const file of files) {
  try {
    docs.set(file, yaml.load(readFileSync(file, "utf8")));
  } catch (e) {
    err(relative(root, file), `YAML parse failed: ${e.message}`);
  }
}

let totalOps = 0;
for (const file of files) {
  const doc = docs.get(file);
  if (!doc) continue;
  const res = validate(file, doc);
  if (res) totalOps += res.ops.length;
}
checkAggregateParity(docs);

const group = (list) => {
  const by = new Map();
  for (const { file, msg } of list) {
    if (!by.has(file)) by.set(file, []);
    by.get(file).push(msg);
  }
  return by;
};

if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s) — documentation quality, not build-blocking:`);
  for (const [file, msgs] of group(warnings)) {
    console.log(`\n  ${file}`);
    for (const m of msgs) console.log(`    · ${m}`);
  }
}

if (errors.length) {
  console.error(`\n✖ ${errors.length} error(s):`);
  for (const [file, msgs] of group(errors)) {
    console.error(`\n  ${file}`);
    for (const m of msgs) console.error(`    · ${m}`);
  }
}

console.log(
  `\n[validate] ${files.length} spec(s), ${totalOps} operation(s) — ` +
    `${errors.length} error(s), ${warnings.length} warning(s).`,
);

if (errors.length > 0) process.exit(1);
if (STRICT && warnings.length > 0) {
  console.error("[validate] --strict: failing on warnings.");
  process.exit(1);
}
