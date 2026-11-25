import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // VITE_API_TARGET picks the API the dev server forwards /api to: the local backend by default,
  // or the shared demo server (address in docs/ENVIRONMENTS.md). Set it in the shell or in frontend/.env.local.
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_TARGET || "http://localhost:4000";
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
    server: {
      port: 5173,
      // same-origin in dev: the browser calls /api and Vite forwards it to the API (cookies keep working)
      proxy: { "/api": { target, changeOrigin: true, secure: true } },
    },
  };
});
