import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: {
    port: 5173,
    // same-origin in dev: the browser calls /api and Vite forwards it to the API
    proxy: {
      "/api": {
        target: loadEnv(mode, import.meta.dirname, "API_").API_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
}));
