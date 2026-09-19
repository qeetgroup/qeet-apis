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

> **Upstream note:** the qeet-notify source spec uses the non-standard
> `notify.api.qeet.in`; `bun run sync` rewrites it to the standard
> `api.notify.qeet.in`. Reconcile it in the qeet-notify repo separately.

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
## Deploying

| Workflow | Trigger | Does |
|---|---|---|
| [ci.yml](.github/workflows/ci.yml) | pull requests | specs · typecheck · lint · tests |
| [deploy.yml](.github/workflows/deploy.yml) | push to `main`, or manual | the same gate, deploys to `api.qeet.in` via the Vercel CLI, then tags and releases |

Every merge to `main` gates, deploys, then tags — the same convention as
`qeet-id-website`, `qeet-id-server` and `qeet-id-console`.

### Versions and releases

The tag is pushed **after** Vercel reports success, so every tag corresponds to
a version that is actually live and a failed deploy leaves no tag behind.

The first release is **v0.0.1** — the lookup defaults to `v0.0.0` when no `v*`
tag exists.

- Merging to `main` bumps the **patch** number.
- For a minor or major bump, run the workflow manually and pick `bump`
  (`patch` / `minor` / `major`).
- Release notes come from `gh release create --generate-notes`.

Tag lookup uses `git tag --sort=-version:refname`, so `v0.0.10` follows
`v0.0.9` rather than sorting before it. The workflow checks out with
`fetch-depth: 0`; a shallow clone would see no tags and every release would be
v0.0.1.

### Setup

**Settings → Secrets and variables → Actions**

| Kind | Name | Where from |
|---|---|---|
| Secret | `VERCEL_TOKEN` | Vercel → Account Settings → Tokens, scoped to the Qeet Group team |
| Variable | `VERCEL_ORG_ID` | `vercel link`, then `.vercel/project.json` |
| Variable | `VERCEL_PROJECT_ID` | same file |

```bash
vercel link                # writes .vercel/project.json (gitignored)
cat .vercel/project.json   # orgId and projectId
```

The Vercel project is **`qeet-api`** → `api.qeet.in`.

`vercel build` + `vercel deploy --prebuilt` build in the Action and upload the
finished output, so Vercel never clones the repository. The deployment is
therefore pinned to the commit the gate actually ran against, and the
repository's visibility is irrelevant to deploying.

If Vercel's Git integration is also connected to this repo it will deploy
pushes to `main` by itself and double up with this workflow — pick one path.

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

### Making Try It work from the deployed portal

Postman can call `http://localhost:8080` because it is a native app with no
same-origin policy. A web page cannot, unless the service allows the page's
origin — that is the entire difference, and the fix is one setting per service.

Verified, with two identical mock APIs on loopback:

```
                       curl        browser page
without CORS headers   200         BLOCKED — "Failed to fetch"
with CORS headers      200         200
```

**Qeet ID and Qeet Notify (Go)** both run `go-chi/cors` and now read the origin
list from one environment variable:

```bash
ALLOWED_ORIGINS=https://api.qeet.in,http://localhost:3005
```

`qeet-id-server` already worked this way and rejects `*` on purpose — it
enables credentialed CORS, where a wildcard is unsafe. `qeet-notify-server`
previously hard-coded `https://*` / `http://*` *with* `AllowCredentials: true`,
which let any website make authenticated requests to it; it is now
config-driven and drops wildcard entries at load time.

**Qeet Pay (Spring Boot)** needs the equivalent `CorsConfiguration`:
allowed origins as above, methods `GET,POST,PUT,PATCH,DELETE,OPTIONS`, and
allowed headers including `Authorization`, `Content-Type` and its API-key
header (`X-Api-Key`; Notify uses `X-Qeet-Api-Key`).

Only set this for local/dev instances. Allowing a browser origin against a
production service is a separate decision with its own review.

**One caveat we could not verify locally:** Chrome treats a request from a
public HTTPS page to a loopback address as Private Network Access and may
additionally require `Access-Control-Allow-Private-Network: true` on the
preflight, which `go-chi/cors` does not send. The test above used a local page,
which is not subject to PNA. If Send still fails from the deployed portal after
setting `ALLOWED_ORIGINS`, that header is the next thing to add.

The portal side needs nothing: a Vercel build automatically calls APIs directly
(no proxy), and a local build uses the proxy, which needs no CORS at all.

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

## Fonts & licenses

Brand fonts are the Qeet faces from `@qeetrix/ui`, self-hosted under
`public/fonts/`: **Cal Sans** (Display / Text / UI cuts) and **Fira Code** for
monospace (SIL OFL 1.1, see `public/fonts/FiraCode-OFL.txt`).