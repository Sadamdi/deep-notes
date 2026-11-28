import { describe, expect, it } from "vitest";
import { streakWasExtended } from "@/lib/streakCelebration";

describe("streakWasExtended", () => {
  it("confirms a server-reported increase", () => {
    expect(streakWasExtended(2, 3)).toBe(true);
  });

  it("does not celebrate a repeat session on the same day", () => {
    expect(streakWasExtended(3, 3)).toBe(false);
  });

  it("does not celebrate without a successful pre-finish stat", () => {
    expect(streakWasExtended(undefined, 1)).toBe(false);
  });
});
