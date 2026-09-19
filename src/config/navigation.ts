/** Navigation for the developer workspace.
 *
 * Deliberately short. The marketing site's nav (Products · Pricing ·
 * Enterprise) does not belong in a documentation workspace — a reader here is
 * trying to integrate, not evaluate (§8). Marketing lives on `/` and is
 * reachable from the footer.
 */
import { LINKS } from "./site";

export interface NavItem {
  label: string;
  href: string;
  /** Matches this route and anything under it, for active state. */
  match?: string;
  external?: boolean;
}

/** The primary developer nav, in order. */
export const DEVELOPER_NAV: NavItem[] = [
  { label: "Guides", href: LINKS.quickstart, match: "/quickstart" },
  { label: "API Reference", href: LINKS.reference, match: "/reference" },
  { label: "SDKs", href: LINKS.sdks, match: "/sdks" },
  { label: "Changelog", href: LINKS.changelog, match: "/changelog" },
];

/** Guide pages, grouped for the docs sidebar. Spec-derived API navigation is
 *  built separately in src/lib/api/navigation.ts. */
export interface DocsSection {
  title: string;
  items: NavItem[];
}

export const DOCS_NAV: DocsSection[] = [
  {
    title: "Get started",
    items: [
      { label: "Quickstart", href: LINKS.quickstart, match: "/quickstart" },
      { label: "Authentication", href: LINKS.authentication, match: "/authentication" },
    ],
  },
  {
    title: "Core concepts",
    items: [
      { label: "Errors & rate limits", href: LINKS.errors, match: "/errors" },
      { label: "API reference", href: LINKS.reference, match: "/reference" },
    ],
  },
  {
    title: "Tooling",
    items: [
      { label: "SDKs & clients", href: LINKS.sdks, match: "/sdks" },
      { label: "Changelog", href: LINKS.changelog, match: "/changelog" },
    ],
  },
];

/** True when `pathname` is within a nav item's section. */
export function isActive(pathname: string, item: NavItem): boolean {
  const match = item.match ?? item.href;
  if (match === "/") return pathname === "/";
  return pathname === match || pathname.startsWith(`${match}/`);
}
