// Six browser smoke tests for the developer platform (plan O9).
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
//   bun scripts/smoke.mjs [baseUrl]
//
// Requires `agent-browser` on PATH (npm i -g agent-browser && agent-browser install).
import { execFileSync } from "node:child_process";

const BASE = process.argv[2] ?? "http://localhost:3005";
const SESSION = "qeet-smoke";

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
} finally {
  try {
    ab("close", "--all");
  } catch {}
}

console.log(
  `\n[smoke] ${results.length - failed}/${results.length} passed${failed ? ` — ${failed} failed` : ""}\n`,
);
process.exit(failed > 0 ? 1 : 0);
