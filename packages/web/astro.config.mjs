import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Only alias to React's edge SSR build for the production build (it uses `require`, broken in
// Vite's dev ESM runtime). Dev uses the normal build.
const isBuild = process.argv.includes("build");

// In dev, proxy backend paths to the local API worker so the browser stays same-origin (mirrors
// prod's first-party cookie) without CORS. lib/api.ts uses these paths; prod uses PUBLIC_API_BASE_URL.
// Override API_DEV_URL if you run the API on another port (e.g. alongside another project).
const devProxyTarget = process.env.API_DEV_URL || "http://localhost:8787";
const devProxy = Object.fromEntries(
  ["/api", "/files"].map((p) => [p, { target: devProxyTarget, changeOrigin: true }]),
);

export default defineConfig({
  output: "server",
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
      ...(isBuild ? { alias: { "react-dom/server": "react-dom/server.edge" } } : {}),
    },
    server: { proxy: devProxy },
  },
});
