import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { PRODUCTS, SCALAR_SOURCES } from "../../src/config/products";
import { SITE } from "../../src/config/site";
import { buildMetadata } from "../../src/lib/seo/metadata";

describe("canonical host", () => {
  // These two must agree, or every canonical/OG URL and the sitemap disagree.
  //
  // The deployed host is `api.qeet.in`, confirmed by the repo owner. Note that
  // `qeet-context/DOMAIN.md` still lists the developer portal as
  // `apis.qeet.in` — that document needs reconciling; this test encodes the
  // host we actually serve, so an accidental revert fails CI.
  it("matches astro.config.mjs", () => {
    const config = readFileSync(new URL("../../astro.config.mjs", import.meta.url), "utf8");
    const match = config.match(/site:\s*"([^"]+)"/);
    expect(match?.[1]).toBe(SITE.url);
  });

  it("is api.qeet.in", () => {
    expect(SITE.url).toBe("https://api.qeet.in");
  });
});

describe("products", () => {
  it("every product has a unique id", () => {
    const ids = PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every product declares at least one environment", () => {
    for (const p of PRODUCTS) {
      expect(p.environments.length).toBeGreaterThan(0);
      for (const env of p.environments) {
        expect(() => new URL(env.url)).not.toThrow();
      }
    }
  });

  it("offers local only for now, so Send cannot hit a live API", () => {
    // Deliberate: production is not a Try-It target (see config/environments.ts).
    // If this fails because production was added back on purpose, pair it with
    // a mutation guard before deleting the assertion.
    for (const p of PRODUCTS) {
      for (const env of p.environments) {
        expect(new URL(env.url).hostname).toBe("localhost");
      }
    }
  });

  it("never publishes an install command for an unpublished package", () => {
    for (const p of PRODUCTS) {
      for (const sdk of p.sdk ?? []) {
        if (!sdk.published) expect(sdk.install).toBeUndefined();
      }
    }
  });

  it("exposes one Scalar source per product", () => {
    expect(SCALAR_SOURCES.length).toBe(PRODUCTS.length);
    for (const s of SCALAR_SOURCES) expect(s.url.endsWith(".yaml")).toBe(true);
  });
});

describe("buildMetadata", () => {
  it("builds a most-specific-first title", () => {
    const m = buildMetadata({ title: "Authentication API", section: "Qeet ID", pathname: "/x" });
    expect(m.title).toBe("Authentication API | Qeet ID | Qeet Developers");
  });

  it("does not repeat the site name", () => {
    expect(buildMetadata({ title: "Qeet Developers", pathname: "/" }).title).toBe(
      "Qeet Developers",
    );
  });

  it("canonicalises with a single trailing slash", () => {
    expect(buildMetadata({ pathname: "/quickstart" }).canonical).toBe(
      "https://api.qeet.in/quickstart/",
    );
    expect(buildMetadata({ pathname: "/" }).canonical).toBe("https://api.qeet.in/");
  });

  it("honours noindex", () => {
    expect(buildMetadata({ pathname: "/x", noindex: true }).robots).toBe("noindex, nofollow");
  });
});
