<div align="center">

# 🛰️ qeet-apis

### The Qeet Group developer portal

**One branded, interactive home for every Qeet product's API** — live at **[api.qeet.in](https://api.qeet.in)**

[![Live](https://img.shields.io/badge/live-api.qeet.in-6b4eff?style=flat-square)](https://api.qeet.in)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Scalar](https://img.shields.io/badge/Scalar-reference-1a1a1a?style=flat-square)](https://scalar.com)
[![Bun](https://img.shields.io/badge/Bun-1.3-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white)](https://spec.openapis.org/oas/v3.1.0)

**780** operations · **16** areas · **3** live product APIs · **100%** vendored from the servers

</div>

---

**qeet-apis** is a static **[Astro](https://astro.build)** site whose interactive API reference is
rendered with **[Scalar](https://scalar.com)** (`@scalar/astro`) and wrapped in a hand-authored,
branded portal — landing, quickstart, authentication, errors, SDKs and changelog. It is the single
home for interactive API docs across the [Qeet Group](https://github.com/qeetgroup) suite; the product
docs at [docs.qeet.in](https://docs.qeet.in) link here rather than embedding specs of their own.

> One philosophy, many products. Each authenticates with **Qeet ID**, is built from **Qeetrix**,
> notifies through **Qeet Notify**, and logs to **Qeet Logs**.

## ✨ Highlights

- 🔎 **Full interactive reference** — search, live request console (Try It), schemas and multi-language
  code samples for all **780** operations, powered by Scalar.
- 📦 **The spec is the source of truth** — every OpenAPI 3.1 document is vendored straight from the
  service that implements it and validated in CI, so the reference **cannot drift** from the API.
- 🗂️ **One product per page, one switcher** — Scalar's own document selector is removed; the only
  product switcher on screen is Qeet's, with a Postman-style folder sidebar per product.
- 🎨 **Branded, dual-theme, no-FOUC** — the `@qeetrix/ui` type system (Cal Sans + Fira Code) and Qeet
  tokens, with a light/dark toggle that drives both the portal and the Scalar pane.
- ⚡ **Static + exactly one server route** — every page is prerendered; a single on-demand proxy powers
  Try It locally.
- 🚀 **Gate → deploy → tag** — every merge to `main` runs the full gate, ships to `api.qeet.in`, then
  tags the version that actually went live.

## 🧭 The APIs

Three products are live in the reference today; the rest of the platform is shown honestly as
*"coming to the API."* Counts and areas come from the vendored specs (re-check with `bun run validate:specs`).

| Product | Reference | Operations | Areas | Auth |
| --- | --- | ---: | ---: | --- |
| 🆔 **Qeet ID** — identity & access | [`/reference`](https://api.qeet.in/reference) | 395 | 5 | Bearer · API key · OAuth 2.1 · SCIM · session |
| 🔔 **Qeet Notify** — notifications | [`/reference/qeet-notify`](https://api.qeet.in/reference/qeet-notify) | 112 | 4 | API key (`X-Qeet-Api-Key`) |
| 💳 **Qeet Pay** — payments & billing | [`/reference/qeet-pay`](https://api.qeet.in/reference/qeet-pay) | 273 | 7 | API key (`X-Api-Key`) |

Each product's per-area specs live under [`public/specs/`](public/specs/); `bun run sync` merges them
into a single per-product bundle (`public/specs/<product>.yaml`) with `x-tagGroups` that render as the
folder sidebar. Source specs come from the sibling server repos:

| Product | Source repo (`../`) | Merged from |
| --- | --- | --- |
| Qeet ID | `qeet-id/qeet-id-server/api/openapi/` | auth · management · federation · developer · operations |
| Qeet Notify | `qeet-notify/qeet-notify-server/api/openapi/` | messaging · subscribers · deliverability · operations |
| Qeet Pay | `qeet-pay/qeet-pay-server/api/openapi/` | payments · payouts · billing · tax · commerce · risk · platform |

> **Upstream note:** the qeet-notify source spec uses the non-standard `notify.api.qeet.in`;
> `bun run sync` rewrites it to the canonical `api.notify.qeet.in`. Reconcile the running service in the
> qeet-notify repo separately (it's a DNS/deploy change, not a docs one).

## 🚀 Quickstart

Bun ≥ 1.3 (`bun@1.3.14` is pinned via `packageManager`) and Node ≥ 20 for the Astro CLI.

```bash
bun install
bun run dev            # → http://localhost:3005  (rebuilds the search catalog first)
```

Build/CI never needs the sibling repos — every generated spec is committed and copied into `dist/`
verbatim. You only need the siblings (`../qeet-id`, `../qeet-notify`, `../qeet-pay`) to re-sync:

```bash
bun run sync           # re-vendor + bundle specs from the sibling server repos
```

## 🛠️ Commands

| Command | What it does |
| --- | --- |
| `bun install` | Install dependencies (Vercel uses `--frozen-lockfile`; add deps with `bun add`). |
| `bun run sync` | Re-vendor + bundle OpenAPI specs from the sibling server repos; vendor Postman. |
| `bun run catalog` | Rebuild `public/search-index.json` (runs automatically inside `dev`/`build`). |
| `bun run validate:specs` | OpenAPI gate — **ERRORs fail**, doc-quality gaps warn. |
| `bun run typecheck` | `astro check`. |
| `bun run lint` | Biome. |
| `bun test` | Unit tests. |
| `bun run test:browser` | 6 browser smoke checks (needs a running preview server). |
| `bun run dev` | Astro dev server on **:3005**. |
| `bun run build` | Static site → `dist/` (+ the one Vercel function). |
| `bun run preview` | Serve the built output on **:3005**. |

## 🏗️ Architecture

**Ownership split** is the whole point of the layout stack. Qeet owns the shell, header, product
switching, the left API navigation, theming, search and SEO. Scalar owns OpenAPI rendering, schemas,
request building, code samples and the API client.

```
┌──────────────────────────── Qeet portal (Astro) ────────────────────────────┐
│  header · product switcher · left API nav · theming · search · SEO           │
│  ┌───────────────────────── Scalar (@scalar/astro) ────────────────────────┐ │
│  │  OpenAPI rendering · schemas · request builder · code samples · Try It  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Layout stack** — `BaseLayout` is `<head>` + theming + skip-link only. On top of it:

```
BaseLayout
├── MarketingLayout   → floating pill header · serves "/"
└── DeveloperLayout   → compact 64px bar · serves everything else
    ├── DocsLayout       sidebar · content · TOC     (guides: quickstart, auth, errors, sdks, changelog)
    └── ReferenceLayout  sidebar · Scalar pane        (the API reference)
```

**One product per reference page.** `/reference` renders Qeet ID; `/reference/qeet-notify` and
`/reference/qeet-pay` are generated from config. Each page hands Scalar a **single** `source`, which
is what removes Scalar's own document selector — so the Qeet product switcher is the only one on screen.

**Static, plus exactly one server route.** `output: "static"` prerenders every page; only
[`src/pages/api/proxy.ts`](src/pages/api/proxy.ts) sets `prerender = false`. That's why `@astrojs/vercel`
is configured — the adapter emits the Build Output API to `.vercel/output`.

**Config is the source of truth.** [`src/config/products.ts`](src/config/products.ts) holds every
product's version, lifecycle, specs, environments, auth, SDKs and Postman assets;
[`src/config/environments.ts`](src/config/environments.ts) gates which environments are published; and
[`src/config/scalar.ts`](src/config/scalar.ts) holds all Scalar options. The landing page and reference
switcher derive from [`src/data/catalog.ts`](src/data/catalog.ts).

## 🌐 Environments & Try It

The reference offers **Local only** — this is an internal developer tool, so the Servers dropdown points
at the stack running on your machine.

| Product | Local |
| --- | --- |
| Qeet ID | `http://localhost:4001` |
| Qeet Notify | `http://localhost:8080` |
| Qeet Pay | `http://localhost:4201` |

Production is deliberately **not** a Try-It target — a one-click Send against the live APIs makes it too
easy to mutate production data while reading the docs. The production hostnames still live in the
downloadable OpenAPI documents, which is where they belong. There is **no staging, test or sandbox tier**
today.

**Try It only works when you run the portal locally.** The request proxy is server-side, so on a deployed
instance `localhost` is *Vercel's* loopback, not your machine:

```
deployed:  browser ─▶ api.qeet.in/api/proxy ─▶ fetch(localhost) ─▶ Vercel's own loopback  ✗
local:     browser ─▶ localhost:3005/api/proxy ─▶ fetch(localhost) ─▶ your API             ✓
```

|  | Read the docs | Try It |
| --- | :---: | :---: |
| Deployed (`api.qeet.in`) | ✅ | ❌ — run locally |
| Local (`bun run dev`) | ✅ | ✅ |

A deployed instance is still the right way to *read* the reference — all operations, schemas, code
samples, spec and Postman downloads. For *sending* requests, run it locally. Making Try It work from the
deployed portal means allowing its origin (CORS + Private Network Access) on each local service — see
[`CLAUDE.md`](CLAUDE.md) for the full recipe.

## 📁 Project structure

```
public/
  specs/        vendored OpenAPI specs + generated <product>.yaml bundles  (run `bun run sync`; don't hand-edit)
  postman/      vendored Postman collections + environments               (run `bun run sync`)
  fonts/        Cal Sans + Fira Code — the @qeetrix/ui brand faces, self-hosted
  brand/        logos, favicon, OG image
src/
  config/       products.ts · environments.ts · scalar.ts · site.ts · navigation.ts  (source of truth)
  data/         catalog.ts — specs, product suite, stats, pricing, FAQ (landing + reference)
  layouts/      BaseLayout → Marketing / Developer → Docs / Reference
  components/    marketing/ · layout/ · navigation/ · docs/ · api/ · brand/
  lib/          api/openapi.ts (anchors) · api/navigation.ts · seo/metadata.ts
  styles/       tokens.css (brand + fonts) · global.css · docs.css · reference.css · scalar.css
  pages/
    index.astro                      marketing landing
    quickstart · authentication · errors · sdks · changelog   (MDX guides)
    reference/index.astro            Qeet ID reference
    reference/[product].astro        Qeet Notify · Qeet Pay references
    api/proxy.ts                     the only server-rendered route (Try It proxy)
scripts/
  sync-specs.mjs · build-catalog.mjs · validate-specs.mjs · smoke.mjs
```

## 📦 Deploying

| Workflow | Trigger | Does |
| --- | --- | --- |
| [`ci.yml`](.github/workflows/ci.yml) | pull requests | validate specs · typecheck · lint · unit tests · build · browser smoke |
| [`deploy.yml`](.github/workflows/deploy.yml) | push to `main`, or manual | the same gate, deploys to `api.qeet.in` via the Vercel CLI, then tags + releases |

Every merge to `main` **gates → deploys → tags**, the same convention as `qeet-id-website`,
`qeet-id-server` and `qeet-id-console`. `ci.yml` is pull-request-only so a merge doesn't run the gate twice.

**Versions & releases.** The tag is created **after** Vercel reports success, so every tag corresponds to
a version that is actually live and a failed deploy leaves no tag behind. Merging to `main` bumps the
**patch** number; run the workflow manually and pick `bump` (`patch`/`minor`/`major`) for a larger bump.
The tag is created through the **GitHub Releases API** with `--target` (server-side), which is not subject
to branch protection. Tag lookup uses `git tag --sort=-version:refname` (numeric order, so `v0.0.10`
follows `v0.0.9`); the first release is `v0.0.1`.

> **Why the Vercel CLI, not Git integration:** `vercel build` + `vercel deploy --prebuilt --prod` build in
> the Action and upload the finished output, so Vercel never clones the repo. The deployment is pinned to
> the exact commit the gate ran against, and repository visibility is irrelevant. If Vercel's Git
> integration is *also* connected it will double-deploy — pick one path. `--prod` is not optional on the
> Hobby plan. Full deploy nuances (including why tagging is done last) live in [`CLAUDE.md`](CLAUDE.md).

## ➕ Adding a product

1. Add the product to `PRODUCTS` in [`scripts/sync-specs.mjs`](scripts/sync-specs.mjs) — slug, `srcDir`,
   specs and 3-env servers. For a multi-spec product, add its area→folder mapping so the specs merge into
   one `x-tagGroups` bundle.
2. Add it to `SPECS` (catalog cards + spec downloads) **and** `SCALAR_SOURCES` (the switcher) in
   [`src/data/catalog.ts`](src/data/catalog.ts), plus a `PRODUCTS` entry in
   [`src/config/products.ts`](src/config/products.ts).
3. `bun run sync && bun run dev` to verify.

## 🎨 Brand & fonts

The type system is the `@qeetrix/ui` brand family — **Cal Sans** (Text + UI cuts) and **Fira Code** for
monospace — self-hosted under [`public/fonts/`](public/fonts/) (this stays a standalone repo,
so the faces are copied rather than depending on the unpublished `@qeetrix/ui`). Tokens live in
[`src/styles/tokens.css`](src/styles/tokens.css); logos, favicon and OG image in `public/brand/`. Fira
Code ships under SIL OFL 1.1 (`public/fonts/FiraCode-OFL.txt`).

---

<div align="center">

Part of the **[Qeet Group](https://github.com/qeetgroup)** suite ·
Contributor notes in **[`CLAUDE.md`](CLAUDE.md)** ·
Read the docs at **[api.qeet.in](https://api.qeet.in)**

</div>
