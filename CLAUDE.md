# qeet-apis — CLAUDE.md

**qeet-apis** — the Qeet Group **developer portal** (`api.qeet.in`). A static
**Astro** site whose interactive API reference is rendered with **Scalar**
(`@scalar/astro`), wrapped in a branded multi-page portal (landing, quickstart,
authentication, errors, SDKs, changelog). This is the single home for interactive
API docs; product docs (`qeet-docs`) link here rather than embedding specs.

## Commands (`cd qeet-apis`)

Bun ≥ 1.3 (`bun@1.3.14` is pinned via `packageManager`). Node ≥ 20 for the Astro CLI.

```bash
bun install
bun run sync            # re-vendor + bundle specs from the sibling server repos
bun run catalog         # rebuild public/search-index.json (runs inside dev/build)
bun run validate:specs  # OpenAPI gate — ERRORs fail, doc-quality gaps warn
bun run typecheck       # astro check
bun run lint            # biome
bun test                # unit tests
bun run test:browser    # 6 browser smoke checks (needs a preview server)
bun run dev             # astro dev on :3005
bun run build           # static dist/
bun run preview         # serve dist/ on :3005
```

## Architecture

**Ownership split.** Qeet owns the shell, header, product switching, the left API
navigation, theming, search and SEO. Scalar owns OpenAPI rendering, schemas,
request building, code samples and the API client. That boundary is the point of
the whole layout stack — see `src/layouts/`.

**Layouts.** `BaseLayout` is `<head>` + theming + skip link only. `MarketingLayout`
(the floating pill header) serves `/`; `DeveloperLayout` (compact 64px bar) serves
everything else, with `DocsLayout` (sidebar · content · TOC) and `ReferenceLayout`
(sidebar · Scalar pane) on top of it.

**One product per reference page.** `/reference` is Qeet ID; `/reference/qeet-notify`
and `/reference/qeet-pay` are generated from `PRODUCTS`. A single Scalar `source`
per page is what removes Scalar's own document selector, so the Qeet product
switcher is the only one on screen.

**Config is the source of truth.** `src/config/products.ts` holds every product's
version, lifecycle, specs, environments, auth, SDKs and Postman assets;
`src/config/environments.ts` gates which environments are published;
`src/config/scalar.ts` holds all Scalar options.

- **Static, plus exactly one server route.** `output: "static"` prerenders every
  page; `src/pages/api/proxy.ts` sets `prerender = false` and is the only
  on-demand route, which is why `@astrojs/vercel` is configured. The adapter
  emits the Build Output API to `.vercel/output`, so `vercel.json` must **not**
  set `outputDirectory` — doing so makes Vercel serve the raw build and skip
  the function entirely.
- **Astro static site.** Pages in [src/pages/](src/pages/); MDX content pages use
  [src/layouts/DocLayout.astro](src/layouts/DocLayout.astro), everything shares
  [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro) (head/SEO/OG, the
  sticky header, footer, and a no-FOUC `data-theme` light/dark toggle).
  `astro.config.mjs` defaults `outDir` to `dist/`, so `vercel.json`
  (`buildCommand: bun run build`, `outputDirectory: dist`, `framework: null`) is
  unchanged. Dual-theme code highlighting via `markdown.shikiConfig`
  (light/dark, switched on `[data-theme="dark"]` in `styles/global.css`).
- **Reference = Scalar.** [src/pages/reference/index.astro](src/pages/reference/index.astro)
  renders `<ScalarComponent>` with a `sources` array — **one entry per product**
  (Qeet ID + Qeet Notify, the document switcher), from `SCALAR_SOURCES` in
  [src/data/catalog.ts](src/data/catalog.ts). The Qeet ID source is the **bundled**
  `public/specs/qeet-id.yaml` (see below) whose `x-tagGroups` render as the
  folder sidebar. Scalar is brand-themed via `theme:"none"` + `customCss` (Qeet
  accent + Cal Sans/Fira Code) and its dark mode is driven from the site toggle.
- **Specs** live in [public/specs/](public/specs/) (`<product>/<name>.yaml`) —
  **vendored copies**, not edited by hand. Refresh with `bun run sync`
  ([scripts/sync-specs.mjs](scripts/sync-specs.mjs)), which copies from the sibling
  repos and rewrites `servers:` per
  [`../qeet-context/DOMAIN.md`](../qeet-context/DOMAIN.md).
  `bun run sync` **also**: (a) merges the 5 Qeet ID specs into
  `public/specs/qeet-id.yaml` with `x-tagGroups` (one folder per area — see
  `QEET_ID_GROUPS`, tags derived from each spec) for the folder sidebar; (b) adds a
  light `x-tagGroups` to the Qeet Notify spec; (c) vendors the qeet-id Postman
  collection into `public/postman/`. Vite copies `public/` into `dist/` verbatim,
  so **build/CI never needs the sibling repos**; Scalar fetches the specs at runtime.
- **Brand.** Type system is the `@qeetrix/ui` brand family (Cal Sans Display/Text/UI
  + Fira Code), self-hosted under `public/fonts/` (this stays a standalone repo, so
  fonts are copied rather than depending on the unpublished `@qeetrix/ui`). Tokens
  in [src/styles/tokens.css](src/styles/tokens.css); logos/favicon/OG in
  `public/brand/`.

## Environments

The reference offers **Local only**. This portal is an internal developer tool:
the people using it run the services on their own machines, so the Servers
dropdown points at your stack.

| Product | Local |
|---|---|
| Qeet ID | `http://localhost:4001` |
| Qeet Notify | `http://localhost:8080` |
| Qeet Pay | `http://localhost:4201` |

Production is deliberately **not** a Try-It target — a one-click Send against
the live APIs makes it too easy to mutate production data while reading the
docs. The production hostnames are still in the downloadable OpenAPI documents,
which is where they belong.

There is no staging, test or sandbox tier today: `api.<product>.staging.qeet.in`
does not resolve.

**Adding one later:** add the entry to `envs()` in
[src/config/products.ts](src/config/products.ts). The Servers dropdown, the
environments table on the guides, and the API-client proxy's allow-list all
derive from it. For a remote host also set `PUBLIC_QEET_PROXY_URL=/api/proxy`,
because the Qeet APIs send no CORS headers.

**If Send fails with "Failed to fetch":** your local service is not allowing the
portal's origin. Add CORS there — the portal calls it directly, by design.

### Deployed vs run locally

**Try It only works when you run the portal locally.** The request proxy is
server-side, so on a deployed instance `localhost` is *Vercel's* loopback, not
your machine:

```
deployed:   browser ─▶ api.qeet.in/api/proxy ─▶ fetch(localhost) ─▶ Vercel's own loopback ✗
local:      browser ─▶ localhost:3005/api/proxy ─▶ fetch(localhost) ─▶ your API ✓
```

The deployed portal detects this and returns a 502 explaining it rather than
timing out. So:

| | Read the docs | Try It |
|---|---|---|
| Deployed (`api.qeet.in`) | yes | no — see below |
| Local (`bun run dev`) | yes | yes |

A deployed instance is still the right way to *read* the reference — all 780
operations, schemas, code samples, spec and Postman downloads. For sending
requests, run it locally.

**If you need Try It from the deployed portal**, the local services have to
allow its origin — then set `PUBLIC_QEET_PROXY_URL=` (empty) so the browser
calls them directly instead of going through the server. That needs, on each
local service: `Access-Control-Allow-Origin` for the portal origin, the auth
headers in `Access-Control-Allow-Headers`, and — because Chrome treats a public
page calling loopback as Private Network Access — `Access-Control-Allow-Private-Network: true`
on the preflight. The portal side is already prepared: `connect-src` permits
`http://localhost:*` and `upgrade-insecure-requests` is deliberately absent, so
`http://localhost` is not rewritten to `https://`.

## Adding a product

1. Add the product to `PRODUCTS` in `scripts/sync-specs.mjs` (slug, srcDir, specs,
   3-env servers). For a multi-spec product, add a bundle step + `QEET_ID_GROUPS`-style
   area→folder mapping so its specs merge into one `x-tagGroups` document.
2. Add it to `SPECS` (catalog cards + spec downloads) **and** `SCALAR_SOURCES` (the
   switcher) in `src/data/catalog.ts`.
3. `bun run sync && bun run dev` to verify.

## Gotchas

- **Anchors.** The reference sidebar links to Scalar's own anchor scheme,
  `<document>/tag/<tagSlug>/<METHOD>/<path>`, mirrored by `tagAnchor()` /
  `operationAnchor()` in `src/lib/api/openapi.ts` and again in
  `scripts/build-catalog.mjs`. Change one, change all three. Do **not** try to
  customise it with `generateTagSlug` / `generateOperationSlug`: function values
  do not survive `renderMode="client"` (Astro JSON-serializes the prop).
- **`defaultOpenAllTags: true` is load-bearing.** Scalar renders an operation's
  section — and therefore its anchor — only once its tag is open. Without it,
  sidebar links have nothing to resolve against.
- **`renderMode="client"` is required.** The default (`static`) injects a whole
  second `<!doctype html>` document inside `<main>`.
- **Theming uses no JavaScript.** `src/styles/scalar.css` emits *identical*
  `.light-mode` and `.dark-mode` blocks whose values are Qeet tokens that flip on
  `[data-theme="dark"]`, so Scalar's own mode is irrelevant. Keep the two blocks
  byte-identical.
- **No `overflow-x: hidden` on `<body>`.** It computes `overflow-y` to `auto`,
  which makes body a scroll container and silently breaks every
  `position: sticky` header and sidebar.
- **Environments.** The reference offers **Local only**; production is not a
  Try-It target (see the Environments section above). There is no sandbox tier
  anywhere in Qeet — do not invent one. One list for everyone: there is no
  public/internal build flag, deliberately.
- **Never claim an unshipped thing.** `products.ts` marks all six SDK packages
  `published: false` (verified 404 on npm), so the UI shows a repo link and no
  install command. Same rule for status pages, SLAs and customers.

- The `@scalar/astro` export is **`ScalarComponent`** (not `Scalar`); config keys
  live on the `configuration` prop (`sources`, `theme`, `customCss`,
  `withDefaultFonts`, `hideDarkModeToggle`, `favicon`, …). Scalar loads its runtime
  from a CDN at view time — needs network in the browser (not at build).
- Specs are committed; don't `.gitignore` `public/specs/`. Don't hand-edit them —
  re-sync.
- Bun blocks dependency lifecycle scripts by default; `trustedDependencies` in
  `package.json` allowlists them (`esbuild`, `sharp`) — keep `sharp` there (Astro
  image pipeline). This replaces the old `pnpm-workspace.yaml` `allowBuilds`.
- `bun.lock` is committed and Vercel installs with `bun install --frozen-lockfile`,
  so add deps with `bun add` (never `npm i`) and commit the lockfile.
