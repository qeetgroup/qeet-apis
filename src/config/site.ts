/** Site-level constants and outbound destinations.
 *
 * `statusPage` and `signIn` are intentionally nullable: the developer header
 * renders those controls only when a real destination exists (O11). Setting
 * them to a plausible-looking URL that 404s is the same class of mistake as
 * documenting an SDK that was never published.
 */

export const SITE = {
  /** Canonical origin. Must match `site:` in astro.config.mjs. */
  url: "https://api.qeet.in",
  /** Product name for the developer platform. */
  name: "Qeet Developers",
  /** Short name used in compact chrome. */
  shortName: "Qeet APIs",
  /** Default social card. */
  ogImage: "/brand/og.png",
  description:
    "The Qeet Group developer platform — interactive API reference, guides and SDKs for Qeet ID, Qeet Notify and Qeet Pay.",
} as const;

export const LINKS = {
  // Internal routes.
  home: "/",
  reference: "/reference",
  quickstart: "/quickstart",
  authentication: "/authentication",
  errors: "/errors",
  sdks: "/sdks",
  changelog: "/changelog",

  // External, verified destinations.
  console: "https://id.qeet.in",
  docs: "https://docs.qeet.in",
  github: "https://github.com/qeetgroup",

  /**
   * No public status page exists for the Qeet APIs today, so the header shows
   * no Status control. Set this to the real URL when one ships.
   */
  status: null as string | null,

  /**
   * The developer portal is a static, unauthenticated site; sign-in belongs to
   * the console. Kept separate from `console` so the header can drop the
   * control without losing the console link elsewhere.
   */
  signIn: "https://id.qeet.in" as string | null,
} as const;
