import { describe, expect, it } from "vitest";
import { DESKTOP_PRIMARY_NAV, MOBILE_PRIMARY_NAV, isDesktopNavActive, isMobileNavActive } from "./navigation";

describe("navigation active state matching", () => {
  it("exposes all 6 desktop items and 5 mobile items from Figma", () => {
    expect(DESKTOP_PRIMARY_NAV.map((i) => i.label)).toEqual([
      "Beranda",
      "Jelajah",
      "Workspace Saya",
      "Game",
      "Studio Penulis",
      "Profil",
    ]);
    expect(MOBILE_PRIMARY_NAV.map((i) => i.label)).toEqual(["Beranda", "Jelajah", "Ruang", "Game", "Menu"]);
  });

  it("marks Workspace Saya / Ruang active on both /workspace and /notebooks/:id", () => {
    expect(isDesktopNavActive("/workspace", "/workspace")).toBe(true);
    expect(isDesktopNavActive("/notebooks/sample", "/workspace")).toBe(true);
    expect(isMobileNavActive("/notebooks/sample", "/workspace")).toBe(true);
    expect(isDesktopNavActive("/jelajah", "/workspace")).toBe(false);
  });

  it("marks Menu active on mobile for child menu routes without affecting desktop items", () => {
    for (const child of ["/menu", "/studio", "/profil", "/pengaturan", "/mengikuti"]) {
      expect(isMobileNavActive(child, "/menu")).toBe(true);
    }
    expect(isDesktopNavActive("/studio", "/studio")).toBe(true);
    expect(isDesktopNavActive("/studio", "/profil")).toBe(false);
  });
});
