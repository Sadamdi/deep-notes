import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BUBI_EMOTIONS, emotionSchema, type Emotion } from "@deep-notes/shared";
import { BubiMascot, getBubiArtwork, getBubiMotion, getBubiPlaybackKey, namespaceBubiArtwork, prepareBubiArtwork } from "./BubiMascot";

describe("Bubi expressions", () => {
  it.each(BUBI_EMOTIONS)("uses the original Figma %s SVG", (emotion) => {
    const markup = renderToStaticMarkup(<BubiMascot emotion={emotion} />);

    expect(getBubiArtwork(emotion)).toBe(emotion);
    expect(markup).toContain(`data-emotion="${emotion}"`);
    expect(markup).toContain(`data-expression="${emotion}"`);
    expect(markup).toContain(`src="/assets/bubi-${emotion}.svg"`);
    expect(markup).toContain('data-fallback-src="/assets/bubi-idle.svg"');
    expect(markup).toContain('data-fallback-label="Bubi tenang"');

    const source = readFileSync(new URL(`../../../public/assets/bubi-${emotion}.svg`, import.meta.url), "utf8");
    const prepared = prepareBubiArtwork(source, emotion);
    expect(prepared?.viewBox).toBe(source.match(/viewBox="([^"]+)"/)?.[1]);
    expect(prepared?.fill).toBe("none");
    expect(prepared?.overflow).toBe("visible");
    expect(prepared?.innerMarkup).toContain('class="bubi-part bubi-part--head"');
    expect(prepared?.innerMarkup).toContain('class="bubi-part bubi-part--arm-left"');
    expect(prepared?.innerMarkup).toContain('class="bubi-part bubi-part--arm-right"');
    expect(prepared?.innerMarkup.match(/bubi-part--head/g)).toHaveLength(1);
    expect(prepared?.innerMarkup).toMatch(/<g id="Bubi[^"]*" class="bubi-part bubi-part--head">/);
  });

  it("normalizes older saved emotion names to the closest Figma pose", () => {
    expect(emotionSchema.parse("neutral")).toBe("idle");
    expect(emotionSchema.parse("curious")).toBe("antusias");
    expect(emotionSchema.parse("happy")).toBe("senang");
    expect(emotionSchema.parse("thinking")).toBe("idle");
    expect(emotionSchema.parse("encouraging")).toBe("semangat");
    expect(emotionSchema.parse("concerned")).toBe("sedih");
    expect(getBubiArtwork("happy")).toBe("senang");
    const legacyMarkup = renderToStaticMarkup(<BubiMascot emotion={"curious" as Emotion} />);
    expect(legacyMarkup).toContain('src="/assets/bubi-antusias.svg"');
  });

  it.each(["wave", "nod", "think", "lean_in", "celebrate"] as const)("keeps the supported %s motion", (animation) => {
    expect(getBubiMotion(animation)).toBe(animation);
  });

  it("uses a still pose for unimplemented or unavailable motion", () => {
    expect(getBubiMotion("dance")).toBe("idle");
    expect(getBubiMotion("wave", ["idle"])).toBe("idle");
    expect(getBubiMotion()).toBe("idle");
    expect(getBubiArtwork("unexpected emotion")).toBe("idle");
  });

  it("falls back when an SVG is missing the expected body parts", () => {
    expect(prepareBubiArtwork('<svg width="1" height="1" viewBox="0 0 1 1"><g id="Bubi"></g></svg>', "idle")).toBeNull();
  });

  it("namespaces SVG ids and local references for each mascot instance", () => {
    const source = readFileSync(new URL("../../../public/assets/bubi-senang.svg", import.meta.url), "utf8");
    const prepared = prepareBubiArtwork(source, "senang");
    expect(prepared).not.toBeNull();
    if (!prepared) return;

    const first = namespaceBubiArtwork(prepared, "bubi-first").innerMarkup;
    const second = namespaceBubiArtwork(prepared, "bubi-second").innerMarkup;
    const ids = (markup: string) => Array.from(markup.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
    const firstIds = ids(first);
    const secondIds = ids(second);
    const references = Array.from(first.matchAll(/(?:xlink:)?href="#([^"]+)"|url\(#([^)]+)\)/g), (match) => match[1] ?? match[2]);

    expect(new Set([...firstIds, ...secondIds]).size).toBe(firstIds.length + secondIds.length);
    expect(references.every((reference) => firstIds.includes(reference))).toBe(true);
  });

  it("changes the render key when a new beat repeats the same motion", () => {
    expect(getBubiPlaybackKey("answer-1:2", "senang", "wave")).not.toBe(getBubiPlaybackKey("answer-1:3", "senang", "wave"));
  });
});
