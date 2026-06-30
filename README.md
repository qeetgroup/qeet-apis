# qeet-apis

The **Qeet Group developer portal** — every product's API in one branded,
interactive home, deployed at **`apis.qeet.in`**.

It's a static **Astro** site. The interactive API reference is rendered with
**[Scalar](https://scalar.com)** (search, live request console, multi-language
code samples, dark mode); the surrounding portal (landing, quickstart, auth,
errors, SDKs, changelog) is hand-authored. OpenAPI specs are **vendored** under
[`public/specs/`](public/specs/) and switched via Scalar's built-in document
selector; each spec carries **Production / Staging / Local** servers.

## Specs

| Product | Specs | Source repo |
| --- | --- | --- |
| Qeet ID | auth, management, federation, developer, operations | `../qeet-id/api/openapi/` |
| Qeet Notify | v1 | `../qeet-notify/api/openapi/` |

## Commands

Node ≥ 20 (use latest via `nvm use node`). pnpm.

```bash
pnpm install
pnpm sync      # re-vendor specs from the sibling repos + apply local/stage/prod servers
pnpm dev       # Astro dev server on http://localhost:3005
pnpm build     # static site → dist/
pnpm preview   # serve the built dist/
```

`pnpm sync` reads the sibling repos (`../qeet-id`, `../qeet-notify`), rewrites each
spec's `servers:` to the canonical hosts, and writes the vendored copy. It also
**merges the 5 Qeet ID specs into `public/specs/qeet-id.yaml` with `x-tagGroups`**
(so the reference sidebar shows a Postman-style folder tree) and **vendors the
qeet-id Postman collection** into `public/postman/`. **Build/CI never needs the
sibling repos** — everything generated is committed and copied into `dist/` as-is.

## Structure

```
public/
  specs/        vendored OpenAPI specs + the generated qeet-id.yaml bundle (run pnpm sync; don't hand-edit)
  postman/      vendored qeet-id Postman collection (run pnpm sync)
  fonts/        Cal Sans + Fira Code (the @qeetrix/ui brand faces, self-hosted)
  brand/        logos, favicon, OG image
src/
  data/catalog.ts        single source of truth: specs, environments, links
  styles/                tokens.css (brand + fonts) + global.css
  layouts/               BaseLayout (chrome/SEO) + DocLayout (MDX content)
  components/            Header, Footer, Hero, ApiCatalog, CodeTabs, …
  pages/
    index.astro          landing
    quickstart.mdx  authentication.mdx  errors.mdx  sdks.mdx  changelog.mdx
    reference/index.astro  Scalar reference (all specs via `sources`)
```

## Adding a product

1. Add the product to `PRODUCTS` in [`scripts/sync-specs.mjs`](scripts/sync-specs.mjs)
   (slug, srcDir, specs, 3-env servers).
2. Add it to `SPECS` (catalog cards + spec downloads) **and** `SCALAR_SOURCES` (the
   reference switcher) in [`src/data/catalog.ts`](src/data/catalog.ts). For a
   multi-spec product, add a bundle step in `sync-specs.mjs` (see `QEET_ID_GROUPS`).
3. `pnpm sync && pnpm dev` to verify.

## Environments

Per [`qeet-files/DOMAIN-ARCHITECTURE.md`](../qeet-files/DOMAIN-ARCHITECTURE.md):

| Product | Local | Staging | Production |
| --- | --- | --- | --- |
| Qeet ID | `localhost:4001` | `api.id.staging.qeet.in` | `api.id.qeet.in` |
| Qeet Notify | `localhost:8080` | `api.notify.staging.qeet.in` | `api.notify.qeet.in` |

> The qeet-notify source spec currently uses the non-standard `notify.api.qeet.in`;
> this portal uses the standard `api.notify.qeet.in`. Reconcile the qeet-notify repo
> separately.

## Fonts & licenses

Brand fonts are the Qeet faces from `@qeetrix/ui`, self-hosted under
`public/fonts/`: **Cal Sans** (Display / Text / UI cuts) and **Fira Code** for
monospace (SIL OFL 1.1, see `public/fonts/FiraCode-OFL.txt`).
