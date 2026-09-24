// Browser smoke tests for the reference and homepage.
//
// Deliberately small. This is not an E2E suite — it covers the handful of
// behaviours that are both critical and easy to break silently, each of which
// actually regressed at least once while the platform was being built:
//
//   1. /reference loads with no console errors
//   2. the Qeet sidebar is populated from the specs
//   3. sidebar → Scalar anchors resolve (this broke three separate times:
//      wrong slug format, wrong anchor path, and functions being dropped by
//      renderMode="client")
//   4. clicking a sidebar row navigates the Scalar pane
//   5. the product switcher reaches a per-product route
//   6. theme persists across a reload, and Scalar follows with no JS
//
// Usage:
//   bun run preview &            # or any static server for dist/
//   bun scripts/smoke.mjs [baseUrl] [--homepage-only]
//
// Requires `agent-browser` on PATH (npm i -g agent-browser && agent-browser install).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3005";
const SESSION = `qeet-smoke-${process.pid}`;
const HOMEPAGE_ONLY = process.argv.includes("--homepage-only");

const ab = (...args) =>
  execFileSync("agent-browser", ["--session", SESSION, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

/** Run JS in the page and parse the JSON it returns. */
const evalJson = (expr) => {
  const raw = ab("eval", expr);
  // `agent-browser eval` prints the JSON-encoded return value.
  const text = raw.startsWith('"') ? JSON.parse(raw) : raw;
  return JSON.parse(text);
};

const results = [];
let failed = 0;

function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, ok: true, detail });
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    failed += 1;
    results.push({ name, ok: false, detail: error.message });
    console.error(`  ✗ ${name} — ${error.message}`);
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

console.log(`\n[smoke] ${BASE}\n`);

try {
  ab("set", "viewport", "1440", "950");

  if (!HOMEPAGE_ONLY) {
    // ---- 1 + 2 + 3: reference loads, sidebar is built, anchors resolve -------
    ab("console", "--clear");
    ab("open", `${BASE}/reference/`);
    ab("wait", "--load", "networkidle");
    ab("wait", "5000");

    check("/reference loads without console errors", () => {
      const log = ab("console");
      const errors = log
        .split("\n")
        .filter((line) => /^\[error\]/i.test(line.trim()))
        .filter((line) => !/favicon/i.test(line));
      assert(errors.length === 0, `console errors:\n${errors.join("\n")}`);
      return "clean";
    });

    check("sidebar is populated from the specs", () => {
      const { groups, operations } = evalJson(`(() => JSON.stringify({
      groups: document.querySelectorAll('[data-reference-nav] .ref-group').length,
      operations: document.querySelectorAll('[data-op-slug]').length,
    }))()`);
      assert(groups > 0, "no sidebar groups rendered");
      assert(operations > 100, `only ${operations} operations in the sidebar`);
      return `${groups} groups, ${operations} operations`;
    });

    check("sidebar anchors resolve against Scalar", () => {
      const { total, resolved } = evalJson(`(() => {
      const links = [...document.querySelectorAll('[data-op-slug]')];
      return JSON.stringify({
        total: links.length,
        resolved: links.filter((a) => document.getElementById(a.dataset.opSlug)).length,
      });
    })()`);
      assert(resolved > 0, "no sidebar link matched a Scalar anchor");
      return `${resolved}/${total} rendered for this product`;
    });

    // ---- 4: sidebar click navigates the pane --------------------------------
    check("clicking a sidebar row scrolls the pane to it", () => {
      const before = evalJson(`(() => JSON.stringify({ y: Math.round(window.scrollY) }))()`);
      ab(
        "eval",
        `(() => {
        const link = [...document.querySelectorAll('[data-op-slug]')]
          .find((a) => document.getElementById(a.dataset.opSlug) && a.offsetParent !== null);
        link?.click();
        return 'ok';
      })()`,
      );
      ab("wait", "1500");
      const after = evalJson(`(() => {
      const row = document.querySelector('[data-op-slug][aria-current="true"]');
      return JSON.stringify({ y: Math.round(window.scrollY), active: row ? row.dataset.opSlug : null });
    })()`);
      assert(after.active !== null, "no sidebar row became active");
      assert(after.y !== before.y, "the pane did not scroll");
      return after.active;
    });

    // ---- 5: product switcher ------------------------------------------------
    check("product switcher reaches a per-product route", () => {
      const { href } = evalJson(`(() => {
      const a = document.querySelector('[data-product-switcher] a[data-product-id="qeet-pay"]');
      return JSON.stringify({ href: a ? a.getAttribute('href') : null });
    })()`);
      assert(href === "/reference/qeet-pay", `unexpected href: ${href}`);
      ab("open", `${BASE}${href}/`);
      ab("wait", "--load", "networkidle");
      ab("wait", "4000");
      const { product } = evalJson(`(() => JSON.stringify({
      product: document.querySelector('[data-product-nav]:not([hidden])')?.dataset.productNav ?? null,
    }))()`);
      assert(product === "qeet-pay", `active product nav is ${product}`);
      return href;
    });

    // ---- 6: theme persists, and Scalar follows ------------------------------
    check("theme persists across reload and Scalar follows", () => {
      ab("eval", `(() => { localStorage.setItem('qeet-theme','dark'); return 'ok'; })()`);
      ab("open", `${BASE}/reference/`);
      ab("wait", "--load", "networkidle");
      ab("wait", "4000");
      const { theme, paneBg } = evalJson(`(() => {
      const pane = document.querySelector('.reference-pane');
      return JSON.stringify({
        theme: document.documentElement.dataset.theme,
        paneBg: getComputedStyle(pane).backgroundColor,
      });
    })()`);
      assert(theme === "dark", `theme is ${theme} after reload`);
      // The Qeet tokens resolve to a near-black canvas in dark mode; a light
      // value here means Scalar did not pick up the theme bridge.
      const [r, g, b] = (paneBg.match(/\d+/g) ?? ["255", "255", "255"]).map(Number);
      assert(r + g + b < 200, `reference pane is still light (${paneBg})`);
      ab("eval", `(() => { localStorage.setItem('qeet-theme','light'); return 'ok'; })()`);
      return "dark applied to shell and pane";
    });
  }

  ab("set", "media", "light", "reduced-motion");
  ab("open", `${BASE}/`);
  ab("wait", "--fn", 'document.fonts.status === "loaded"');
  ab("eval", 'document.querySelector("astro-dev-toolbar")?.remove()');

  check("homepage has the agreed sections and real anchors", () => {
    const result = evalJson(`(() => JSON.stringify({
      sections: [...document.querySelector('#main').children]
        .filter(element => element.tagName === 'SECTION').map(section => section.id || 'hero'),
      resources: document.querySelectorAll('#resources .resource-link').length,
      footers: document.querySelectorAll('.portal-footer').length,
      missing: [...document.querySelectorAll('a[href]')].map(link => new URL(link.href))
        .filter(url => url.origin === location.origin && url.pathname === location.pathname &&
          url.hash && !document.getElementById(decodeURIComponent(url.hash.slice(1)))).map(url => url.hash),
    }))()`);
    assert(
      JSON.stringify(result.sections) ===
        JSON.stringify([
          "hero",
          "products",
          "platform",
          "standards",
          "journey",
          "engineering",
          "resources",
          "start-building",
        ]),
      `unexpected section order: ${result.sections}`,
    );
    assert(result.resources === 6 && result.footers === 1, "missing resource links or footer");
    assert(result.missing.length === 0, `missing anchors: ${result.missing}`);
    return "eight sections, footer, six resources, no dead anchors";
  });

  check("engineering coverage matches the generated API catalog", () => {
    const catalog = JSON.parse(
      readFileSync(new URL("../public/search-index.json", import.meta.url), "utf8"),
    );
    const expected = catalog.entries.filter((entry) => entry.kind === "operation").length;
    const result = evalJson(`JSON.stringify({
      operations: Number(document.querySelector('.engineering-metrics dd').textContent.replaceAll(',', '')),
    })`);
    assert(
      result.operations === expected,
      `${result.operations} operations shown; catalog has ${expected}`,
    );
    return `${expected} documented operations`;
  });

  check("search completes a query entered before the index loads", () => {
    ab(
      "eval",
      `(() => {
      const original = window.fetch.bind(window);
      window.restoreSearchFetch = () => { window.fetch = original; };
      window.fetch = (...args) => args[0] === '/search-index.json'
        ? original(...args).then(response => new Promise(resolve => {
            window.releaseSearchIndex = () => resolve(response);
          }))
        : original(...args);
    })()`,
    );
    ab("focus", "#platform button[data-search-trigger]");
    ab("press", "Enter");
    ab("fill", "[data-palette-input]", "passkey");
    ab("wait", "--fn", 'typeof window.releaseSearchIndex === "function"');
    ab("eval", "window.releaseSearchIndex(); window.restoreSearchFetch()");
    ab("wait", "--fn", 'document.querySelector("[data-palette-results] a") !== null');
    const result = evalJson(`JSON.stringify({
      first: document.querySelector('[data-palette-results] a').getAttribute('href'),
    })`);
    assert(result.first.includes("passkey"), `unexpected search result: ${result.first}`);
    ab("press", "Escape");
    ab("wait", "--fn", 'document.querySelector("[data-palette]").open === false');
    return "query preserved and results rendered";
  });

  check("journey code tabs are keyboard-accessible and local only", () => {
    ab("scrollintoview", ".journey-code");
    ab("click", "#journey-request-tab-0");
    ab("wait", "--fn", 'document.activeElement.id === "journey-request-tab-0"');
    ab("press", "ArrowRight");
    ab(
      "wait",
      "--fn",
      'document.getElementById("journey-request-tab-1").getAttribute("aria-selected") === "true"',
    );
    ab("press", "End");
    ab(
      "wait",
      "--fn",
      'document.getElementById("journey-request-tab-2").getAttribute("aria-selected") === "true"',
    );
    const result = evalJson(`JSON.stringify({
      selected: document.querySelector('.journey-code [aria-selected="true"]').textContent.trim(),
      code: document.querySelector('.journey-code .codetabs__panel[data-active]').textContent,
    })`);
    assert(result.selected === "Python", `selected tab: ${result.selected}`);
    assert(
      result.code.includes("http://localhost:4001/v1/auth/me"),
      "sample does not use the local service",
    );
    assert(!result.code.includes("api.id.qeet.in"), "sample targets production");
    ab("press", "Home");
    ab("click", ".journey-code .codetabs__copy");
    ab(
      "wait",
      "--fn",
      'document.querySelector(".journey-code .codetabs__copy").classList.contains("is-copied")',
    );
    return "keyboard navigation and copy feedback work";
  });

  check("homepage fits phone, tablet, landscape, and desktop viewports", () => {
    const viewports = [
      [320, 568],
      [360, 800],
      [375, 812],
      [390, 844],
      [430, 932],
      [600, 900],
      [640, 960],
      [768, 1024],
      [820, 1180],
      [844, 390],
      [1024, 768],
      [1199, 800],
      [1200, 800],
      [1279, 800],
      [1280, 800],
      [1366, 768],
      [1440, 900],
      [1536, 864],
      [1920, 1080],
      [2560, 1440],
    ];
    for (const [width, height] of viewports) {
      ab("set", "viewport", String(width), String(height));
      const result = evalJson(`(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const overflow = [...document.querySelectorAll('#main h1, #main h2, #main h3, #main p, #main button, .portal-footer a')]
          .filter(element => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && !element.closest('[aria-hidden="true"], [hidden], pre') &&
              getComputedStyle(element).visibility !== 'hidden' && (box.left < -1 || box.right > innerWidth + 1);
          }).map(element => element.className);
        const heading = document.querySelector('.hero-title');
        const lineHeight = parseFloat(getComputedStyle(heading).lineHeight);
        const ecosystemHeading = document.querySelector('.ecosystem-title');
        const ecosystemLineHeight = parseFloat(getComputedStyle(ecosystemHeading).lineHeight);
        const smallTargets = [...document.querySelectorAll('.platform-hero a, .platform-hero button, .platform-hero select')]
          .filter(element => {
            const box = element.getBoundingClientRect();
            return innerWidth < 1200 && box.width > 0 && (box.width < 43.5 || box.height < 43.5);
          }).map(element => element.className);
        return JSON.stringify({
          viewport: innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          overflow,
          headlineFits: heading.scrollWidth <= heading.clientWidth + 1,
          headlineLines: Math.round(heading.offsetHeight / lineHeight),
          ecosystemFits: ecosystemHeading.scrollWidth <= ecosystemHeading.clientWidth + 1,
          ecosystemLines: Math.round(ecosystemHeading.offsetHeight / ecosystemLineHeight),
          ecosystemText: [...ecosystemHeading.children].map(line => line.textContent),
          smallTargets,
        });
      })()`);
      assert(
        result.pageWidth <= width && result.overflow.length === 0,
        `${width}px overflow: page=${result.pageWidth}, elements=${result.overflow}`,
      );
      assert(
        result.headlineLines === 2 && result.headlineFits,
        `${width}px hero headline does not fit two lines`,
      );
      assert(
        result.ecosystemLines === 2 && result.ecosystemFits,
        `${width}px ecosystem heading does not fit two lines`,
      );
      assert(
        JSON.stringify(result.ecosystemText) ===
          JSON.stringify(["Every Qeet product.", "One developer experience."]),
        "ecosystem heading text or word spacing changed",
      );
      assert(
        result.smallTargets.length === 0,
        `${width}px undersized hero controls: ${result.smallTargets}`,
      );
    }
    return `${viewports.length} responsive viewports, two-line headings, touch-sized controls`;
  });

  check("search fits short landscape screens and closes by touch", () => {
    ab("set", "viewport", "844", "390");
    ab("focus", ".header-search");
    ab("press", "Enter");
    ab("fill", "[data-palette-input]", "passkey");
    ab("wait", "--fn", 'document.querySelector("[data-palette-results] a") !== null');
    const result = evalJson(`(() => {
      const dialog = document.querySelector('[data-palette]').getBoundingClientRect();
      const close = document.querySelector('[data-palette-close]').getBoundingClientRect();
      return JSON.stringify({
        fits: dialog.top >= 0 && dialog.bottom <= innerHeight && dialog.left >= 0 && dialog.right <= innerWidth,
        closeTarget: close.width >= 44 && close.height >= 44,
      });
    })()`);
    assert(result.fits && result.closeTarget, "landscape search or its close control is clipped");
    ab("click", "[data-palette-close]");
    ab("wait", "--fn", 'document.querySelector("[data-palette]").open === false');
    return "landscape bounds and visible close action verified";
  });

  check("mobile menu scrolls, contains focus, and unlocks on resize", () => {
    ab("set", "viewport", "390", "844");
    ab("click", "#nav-toggle");
    const result = evalJson(`(() => {
      const menu = document.getElementById('mobile-nav');
      menu.scrollTop = menu.scrollHeight;
      const last = [...menu.querySelectorAll('a')].at(-1);
      last.focus();
      return JSON.stringify({
        lastReachable: last.getBoundingClientRect().bottom <= innerHeight,
        mainInert: document.getElementById('main').inert,
      });
    })()`);
    assert(result.lastReachable && result.mainInert, "mobile menu cannot reach its final action");
    ab("press", "Tab");
    const focus = evalJson("JSON.stringify({ id: document.activeElement.id })");
    assert(focus.id === "nav-toggle", "focus escaped the mobile menu");
    ab("set", "viewport", "1440", "950");
    ab(
      "wait",
      "--fn",
      'document.getElementById("nav-toggle").getAttribute("aria-expanded") === "false"',
    );
    const closed = evalJson(`JSON.stringify({
      locked: document.documentElement.classList.contains('nav-lock'),
      inert: document.getElementById('main').inert,
    })`);
    assert(!closed.locked && !closed.inert, "resizing left the page locked");
    return "scroll, keyboard focus, and desktop resize verified";
  });
} finally {
  try {
    ab("close");
  } catch {}
}

console.log(
  `\n[smoke] ${results.length - failed}/${results.length} passed${failed ? ` — ${failed} failed` : ""}\n`,
);
process.exit(failed > 0 ? 1 : 0);
