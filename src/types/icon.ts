/** The icon names the portal can render.
 *
 * This is the source of truth rather than `keyof typeof ICONS` inside
 * Icon.astro, because config modules (src/config/products.ts) need the union
 * too and an .astro file's frontmatter can't be imported from TypeScript.
 *
 * Icon.astro asserts its map `satisfies Record<LucideIconName, unknown>`, so a
 * name added here without a matching import — or an import removed while a name
 * remains — is a compile error rather than a blank space at runtime.
 */
export type LucideIconName =
  | "activity"
  | "alert"
  | "arrow-right"
  | "arrow-up-right"
  | "bell"
  | "blocks"
  | "bolt"
  | "book"
  | "braces"
  | "building-2"
  | "chart-column"
  | "check"
  | "chevron-down"
  | "circle-check"
  | "clock"
  | "code"
  | "command"
  | "copy"
  | "cpu"
  | "credit-card"
  | "database"
  | "download"
  | "external-link"
  | "fingerprint"
  | "gauge"
  | "git-branch"
  | "globe"
  | "history"
  | "key"
  | "layers"
  | "lock"
  | "menu"
  | "message-square"
  | "moon"
  | "newspaper"
  | "package"
  | "play"
  | "plus"
  | "radio"
  | "refresh-cw"
  | "rocket"
  | "scale"
  | "search"
  | "send"
  | "server"
  | "shield"
  | "sparkles"
  | "sun"
  | "terminal"
  | "trending-up"
  | "user-plus"
  | "users"
  | "waypoints"
  | "webhook"
  | "workflow"
  | "x"
  | "zap";

/** Every renderable name, including the custom inline brand mark. */
export type IconName = LucideIconName | "github";
