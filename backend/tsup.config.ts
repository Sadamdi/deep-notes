import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  sourcemap: true,
  // the shared package ships as TypeScript source, so it must be bundled
  noExternal: ["@deep-notes/shared"],
});
