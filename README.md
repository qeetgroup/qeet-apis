# qeet-apis

The **Qeet Group developer portal** — every product's API in one branded,
interactive home, deployed at **`api.qeet.in`**.

It's a static **Astro** site. The interactive API reference is rendered with
**[Scalar](https://scalar.com)** (search, live request console, multi-language
code samples, dark mode); the surrounding portal (landing, quickstart, auth,
errors, SDKs, changelog) is hand-authored. OpenAPI specs are **vendored** under
[`public/specs/`](public/specs/) and switched via Scalar's built-in document
selector; each spec carries **Production / Staging / Local** servers.

## Specs

| Product | Specs | Source repo |
| --- | --- | --- |
| Qeet ID | auth, management, federation, developer, operations | `../qeet-servers/qeet-id-server/api/openapi/` |
| Qeet Notify | v1 | `../qeet-notify/api/openapi/` |

## Commands

Bun ≥ 1.3 (`bun@1.3.14` is pinned via `packageManager`). Node ≥ 20 for the Astro CLI.

```bash
bun install
bun run sync      # re-vendor specs from the sibling repos + apply local/stage/prod servers
bun run dev       # Astro dev server on http://localhost:3005
bun run build     # static site → dist/
bun run preview   # serve the built dist/
```

`bun run sync` reads the sibling repos (`../qeet-id`, `../qeet-notify`), rewrites each
spec's `servers:` to the canonical hosts, and writes the vendored copy. It also
**merges the 5 Qeet ID specs into `public/specs/qeet-id.yaml` with `x-tagGroups`**
(so the reference sidebar shows a Postman-style folder tree) and **vendors the
qeet-id Postman collection** into `public/postman/`. **Build/CI never needs the
sibling repos** — everything generated is committed and copied into `dist/` as-is.

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

## Structure

```
public/
  specs/        vendored OpenAPI specs + the generated qeet-id.yaml bundle (run bun run sync; don't hand-edit)
  postman/      vendored qeet-id Postman collection (run bun run sync)
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
3. `bun run sync && bun run dev` to verify.

## Environments

Per `qeet-context/DOMAIN.md`:

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