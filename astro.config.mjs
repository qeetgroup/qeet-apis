// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";

// Static developer portal for api.qeet.in. Specs live in public/specs/
// (vendored by `bun run sync`) and are copied verbatim into the output, so
// build/CI never needs the sibling repos; Scalar fetches them at runtime.
//
// The site stays static: `output: "static"` prerenders every page. The adapter
// is here for the single `prerender = false` route — src/pages/api/proxy.ts,
// which forwards API-client requests because the Qeet APIs send no CORS
// headers. Without an adapter that route cannot execute, and Vite would serve
// its source as a module instead (200 + text/javascript + the file itself).
export default defineConfig({
  output: "static",
  adapter: vercel(),
  site: "https://api.qeet.in",
  server: { port: 3005 },
  integrations: [mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
  markdown: {
    // Dual-theme code blocks: emit both palettes as CSS vars and switch on
    // [data-theme="dark"] (see the .astro-code rules in styles/global.css).
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      wrap: true,
    },
  },
});
