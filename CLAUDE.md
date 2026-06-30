# qeet-apis — CLAUDE.md

**qeet-apis** — the Qeet Group **developer portal** (`apis.qeet.in`). A static
**Astro** site whose interactive API reference is rendered with **Scalar**
(`@scalar/astro`), wrapped in a branded multi-page portal (landing, quickstart,
authentication, errors, SDKs, changelog). This is the single home for interactive
API docs; product docs (`qeet-docs`) link here rather than embedding specs.

## Commands (`cd qeet-apis`)

Node ≥ 20 (use latest via `nvm use node`). pnpm.

```bash
pnpm install
pnpm sync      # re-vendor specs from ../qeet-id + ../qeet-notify, applying local/stage/prod servers
pnpm dev       # astro dev on :3005
pnpm build     # static dist/
pnpm preview   # serve dist/ on :3005
```

## Architecture

- **Astro static site.** Pages in [src/pages/](src/pages/); MDX content pages use
  [src/layouts/DocLayout.astro](src/layouts/DocLayout.astro), everything shares
  [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro) (head/SEO/OG, the
  sticky header, footer, and a no-FOUC `data-theme` light/dark toggle).
  `astro.config.mjs` defaults `outDir` to `dist/`, so `vercel.json`
  (`buildCommand: pnpm build`, `outputDirectory: dist`, `framework: null`) is
  unchanged. Dual-theme code highlighting via `markdown.shikiConfig`
  (light/dark, switched on `[data-theme="dark"]` in `styles/global.css`).
- **Reference = Scalar.** [src/pages/reference/index.astro](src/pages/reference/index.astro)
  renders `<ScalarComponent>` with a `sources` array (one entry per spec → the
  document switcher). The sources, environments, catalog cards and nav links all
  derive from [src/data/catalog.ts](src/data/catalog.ts) — **edit specs there in
  one place.** Scalar is brand-themed via `theme:"none"` + `customCss` (Qeet
  accent + Cal Sans/Fira Code) and its dark mode is driven from the site toggle.
- **Specs** live in [public/specs/](public/specs/) (`<product>/<name>.yaml`) —
  **vendored copies**, not edited by hand. Refresh with `pnpm sync`
  ([scripts/sync-specs.mjs](scripts/sync-specs.mjs)), which copies from the sibling
  repos and rewrites `servers:` per
  [`../qeet-files/DOMAIN-ARCHITECTURE.md`](../qeet-files/DOMAIN-ARCHITECTURE.md).
  Vite copies `public/` into `dist/` verbatim, so **build/CI never needs the
  sibling repos**; Scalar fetches the specs at runtime.
- **Brand.** Type system is the `@qeetrix/ui` brand family (Cal Sans Display/Text/UI
  + Fira Code), self-hosted under `public/fonts/` (this stays a standalone repo, so
  fonts are copied rather than depending on the unpublished `@qeetrix/ui`). Tokens
  in [src/styles/tokens.css](src/styles/tokens.css); logos/favicon/OG in
  `public/brand/`.

## Adding a product

1. Add the product to `PRODUCTS` in `scripts/sync-specs.mjs` (slug, srcDir, specs,
   3-env servers).
2. Add the spec(s) to `SPECS` in `src/data/catalog.ts` (catalog cards + Scalar
   `sources` both derive from it).
3. `pnpm sync && pnpm dev` to verify.

## Gotchas

- The `@scalar/astro` export is **`ScalarComponent`** (not `Scalar`); config keys
  live on the `configuration` prop (`sources`, `theme`, `customCss`,
  `withDefaultFonts`, `hideDarkModeToggle`, `favicon`, …). Scalar loads its runtime
  from a CDN at view time — needs network in the browser (not at build).
- Specs are committed; don't `.gitignore` `public/specs/`. Don't hand-edit them —
  re-sync.
- `pnpm-workspace.yaml` allowlists build scripts (`esbuild`, `sharp`); keep `sharp`
  enabled (Astro image pipeline).
