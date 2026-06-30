// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Static developer portal for apis.qeet.in. Astro defaults outDir to dist/, so
// vercel.json (buildCommand: pnpm build, outputDirectory: dist, framework: null)
// keeps working unchanged. Specs live in public/specs/ (vendored by pnpm sync)
// and are copied verbatim into dist/ — Scalar fetches them at runtime.
export default defineConfig({
  site: "https://apis.qeet.in",
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
