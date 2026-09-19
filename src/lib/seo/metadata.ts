/** Page metadata construction — one place that decides titles, canonicals and
 *  social tags, so every route is predictable (§21).
 *
 *  Title shape, most specific first:
 *      "Authentication API | Qeet ID | Qeet Developers"
 *      "Quickstart | Qeet Developers"
 *      "Qeet Developers"            (home only)
 *
 *  A pipe separator is used rather than the previous middot because the parts
 *  are independent scopes, not a sentence.
 */
import { SITE } from "../../config/site";

export interface MetadataInput {
  /** Most specific label, e.g. "Authentication API". Omit on the home page. */
  title?: string;
  /** Optional middle scope, e.g. "Qeet ID". */
  section?: string;
  description?: string;
  /** Path-relative or absolute social image. */
  ogImage?: string;
  /** Current pathname, for the canonical URL. */
  pathname: string;
  /** `noindex` for pages that should not be in search results. */
  noindex?: boolean;
  /** og:type — "website" for landing/index pages, "article" for guides. */
  type?: "website" | "article";
}

export interface Metadata {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  robots: string;
  type: "website" | "article";
}

/** Collapse a path to a canonical URL with a single trailing slash. */
function canonicalUrl(pathname: string): string {
  const clean = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return new URL(clean === "//" ? "/" : clean, SITE.url).href;
}

export function buildMetadata(input: MetadataInput): Metadata {
  const parts = [input.title, input.section, SITE.name].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  // De-duplicate so an explicit title of "Qeet Developers" doesn't repeat.
  const title = [...new Set(parts)].join(" | ");

  return {
    title,
    description: input.description ?? SITE.description,
    canonical: canonicalUrl(input.pathname),
    ogImage: new URL(input.ogImage ?? SITE.ogImage, SITE.url).href,
    robots: input.noindex ? "noindex, nofollow" : "index, follow",
    type: input.type ?? "website",
  };
}
