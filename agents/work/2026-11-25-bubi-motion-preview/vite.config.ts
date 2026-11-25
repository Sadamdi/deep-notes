import { mergeConfig } from "vite";
import frontendConfig from "../../../frontend/vite.config.ts";

export default mergeConfig(frontendConfig, {
  publicDir: "D:/FolderSelainKuliah/Lomba/itbHachton/deep-notes/frontend/public",
  server: { host: "127.0.0.1", port: 5175 },
});
