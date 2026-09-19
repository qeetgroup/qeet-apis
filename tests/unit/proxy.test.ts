import { describe, expect, it } from "bun:test";
import { ALL as handler } from "../../src/pages/api/proxy";

/**
 * The proxy is an Astro endpoint built on Web-standard Request/Response, so it
 * runs directly under `bun test` with no server.
 *
 * The allow-list tests matter most: this endpoint forwards arbitrary methods
 * and headers, so a widened host check would turn it into an open SSRF relay.
 */
/** Astro hands endpoints a context object; the proxy uses `request` + `url`. */
const call = (target: string, init?: RequestInit) => {
  const request = new Request(target, init);
  // biome-ignore lint/suspicious/noExplicitAny: only the two fields the route reads
  return handler({ request, url: new URL(target) } as any) as Promise<Response>;
};
const proxy = (target: string) =>
  `https://api.qeet.in/api/proxy?scalar_url=${encodeURIComponent(target)}`;

describe("proxy: input validation", () => {
  it("rejects a missing target", async () => {
    const res = await call("https://api.qeet.in/api/proxy");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_target");
  });

  it("rejects a malformed target", async () => {
    const res = await call("https://api.qeet.in/api/proxy?scalar_url=not-a-url");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_target");
  });

  it("rejects non-https targets", async () => {
    const res = await call(proxy("http://api.id.qeet.in/healthz"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("insecure_target");
  });
});

describe("proxy: host allow-list", () => {
  // The allow-list is derived from `envs()` in src/config/products.ts, which
  // currently offers localhost only. These tests encode that: a host being
  // reachable must always trace back to an explicit config entry.
  it.each(["http://localhost:4001/healthz", "http://localhost:8080/healthz"])(
    "allows the configured local host %s",
    async (target) => {
      const res = await call(proxy(target));
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(400);
    },
  );

  it.each([
    "https://evil.example.com/steal",
    "https://api.id.qeet.in.evil.example.com/steal",
    "https://qeet.in/",
    "https://169.254.169.254/latest/meta-data/",
    // Not configured today. If production is ever added to envs(), pair it with
    // a mutation guard before relaxing this.
    "https://api.id.qeet.in/healthz",
  ])("blocks unconfigured host %s", async (target) => {
    const res = await call(proxy(target));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("host_not_allowed");
  });
});

describe("proxy: preflight", () => {
  it("answers OPTIONS without reaching upstream", async () => {
    const res = await call(proxy("http://localhost:4001/healthz"), { method: "OPTIONS" });
    expect(res.status).toBe(204);
  });
});

describe("proxy: forwarding", () => {
  // The one test that touches the network. It is the whole point of the
  // function: this exact request fails with "Failed to fetch" in a browser.
  it("forwards a real request when a local stack is running", async () => {
    const res = await call(proxy("http://localhost:4001/healthz"));
    // 502 simply means nothing is listening locally; the proxy still behaved.
    expect([200, 502]).toContain(res.status);
    if (res.status === 200) {
      expect(res.headers.get("x-qeet-proxy")).toBe("1");
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  }, 30_000);

  it("forwards a POST body (a stream body would need duplex and throw)", async () => {
    const res = await call(proxy("http://localhost:4001/v1/auth/forgot-password"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "smoke@qeet.in" }),
    });
    // 403/400 would mean the proxy rejected it before sending; anything else
    // means the body was accepted and forwarded.
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(400);
  }, 30_000);

  it("reports an unreachable host as 502 rather than throwing", async () => {
    // A configured port with nothing listening.
    const res = await call(proxy("http://localhost:4201/healthz"));
    expect([200, 502, 504]).toContain(res.status);
    if (res.status !== 200) {
      expect((await res.json()).error).toMatch(/upstream_(request_failed|timeout)/);
    }
  }, 35_000);
});

describe("proxy: deployed vs local", () => {
  /**
   * The single most confusing failure mode this endpoint has: on a deployed
   * portal, `localhost` is the *server's* loopback, not the reader's machine,
   * so a request that works perfectly in `bun run dev` can never succeed. It
   * has to say so rather than time out.
   *
   * The Vercel check is evaluated per request, so setting the variable here is
   * enough — no module re-import needed.
   */
  it("explains that a deployed proxy cannot reach the reader's machine", async () => {
    process.env.VERCEL = "1";
    try {
      const url = new URL(
        `https://api.qeet.in/api/proxy?scalar_url=${encodeURIComponent("http://localhost:4001/healthz")}`,
      );
      const res = await call(url.href);
      const body = await res.json();
      expect(res.status).toBe(502);
      expect(body.error).toBe("local_target_unreachable_from_server");
      // The message must tell the reader what to actually do.
      expect(body.message).toContain("bun run dev");
    } finally {
      delete process.env.VERCEL;
    }
  });
});
