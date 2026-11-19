import type { Health } from "@deep-notes/shared";

export const healthService = {
  check(): Health {
    return { status: "ok", service: "deep-notes-api", time: new Date().toISOString() };
  },
};
