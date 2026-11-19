import { createApp } from "./app.js";
import { env } from "./config/env.js";

createApp().listen(env.PORT, () => {
  console.info(`deep-notes api listening on :${env.PORT}`);
});
