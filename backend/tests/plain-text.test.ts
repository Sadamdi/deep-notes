import { describe, expect, it } from "vitest";
import { plainText } from "../src/lib/plainText.js";

describe("plain text from the model", () => {
  it("removes markdown emphasis but keeps arithmetic and code", () => {
    expect(plainText("TCP memakai *three-way handshake* dan **andal**.")).toBe("TCP memakai three-way handshake dan andal.");
    expect(plainText("2 * 3 * 4 dan nama_file*.txt")).toBe("2 * 3 * 4 dan nama_file*.txt");
  });

  it("removes passage numbers that only exist in the prompt", () => {
    expect(plainText("Dari Sumber [1], jelaskan topologi bintang.")).toBe("Jelaskan topologi bintang.");
    expect(plainText("Jelaskan HTTPS, seperti yang dijelaskan dalam Sumber [3], bagi pengguna.")).toBe("Jelaskan HTTPS bagi pengguna.");
    expect(plainText("Apa fungsi firewall (Sumber [2])?")).toBe("Apa fungsi firewall?");
  });
});
