import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Use the documented demo API unless a developer explicitly selects another backend.
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_TARGET || "https://deepnotes-api.vercel.app";
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
