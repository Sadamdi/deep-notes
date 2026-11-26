import { useEffect, useId, useMemo, useState } from "react";
import { ANIMATIONS, emotionSchema, type Animation, type Emotion } from "@deep-notes/shared";
import { cn } from "@/lib/utils";

const emotionNames: Record<Emotion, string> = {
  idle: "tenang",
  senang: "senang",
  sedih: "sedih",
  marah: "marah",
  antusias: "antusias",
  semangat: "semangat",
};

const artworks: Record<Emotion, string> = {
  idle: "/assets/bubi-idle.svg",
  senang: "/assets/bubi-senang.svg",
  sedih: "/assets/bubi-sedih.svg",
  marah: "/assets/bubi-marah.svg",
  antusias: "/assets/bubi-antusias.svg",
  semangat: "/assets/bubi-semangat.svg",
};

const supportedMotions = new Set<Animation>(ANIMATIONS.filter((name) => name !== "idle"));

type BubiPart = "head" | "arm-left" | "arm-right";

const armAnatomy: Record<Emotion, Record<Exclude<BubiPart, "head">, readonly string[]>> = {
  idle: {
    "arm-left": ["Vector 8"],
    "arm-right": ["Vector 5"],
  },
  senang: {
    "arm-left": ["Vector 29"],
    "arm-right": ["Vector 21"],
  },
  sedih: {
    "arm-left": ["Vector 29"],
    "arm-right": ["Vector 35"],
  },
  marah: {
    "arm-left": ["Vector 29"],
    "arm-right": ["Vector 43"],
  },
  antusias: {
    "arm-left": ["Vector 29"],
    "arm-right": ["Vector 21"],
  },
  semangat: {
    "arm-left": ["Vector 29"],
    "arm-right": ["Vector 49"],
  },
};

type PreparedArtwork = {
  width: string;
  height: string;
  viewBox: string;
  fill: string;
  overflow: string;
  innerMarkup: string;
};

const artworkCache = new Map<string, Promise<PreparedArtwork | null>>();

export function getBubiArtwork(emotion: unknown) {
  const parsed = emotionSchema.safeParse(emotion);
  return parsed.success ? parsed.data : "idle";
}

export function getBubiMotion(animation?: Animation, availableAnimations?: readonly Animation[]) {
  if (!animation || !supportedMotions.has(animation) || (availableAnimations && !availableAnimations.includes(animation))) return "idle";
  return animation;
}

export function getBubiPlaybackKey(animationKey: string | number | undefined, emotion: Emotion, motion: string) {
  return `${animationKey ?? "default"}:${emotion}:${motion}`;
}

export function prepareBubiArtwork(svg: string, emotion: Emotion): PreparedArtwork | null {
  const root = svg.match(/^\s*<svg\b([^>]*)>/i);
  const closingTag = svg.lastIndexOf("</svg>");
  const openingTag = root?.[0];
  const rootAttributes = root?.[1];
  if (!openingTag || !rootAttributes || closingTag <= openingTag.length) return null;

  const attribute = (name: string) => rootAttributes.match(new RegExp(`\\b${name}="([^"]+)"`, "i"))?.[1];
  const viewBox = attribute("viewBox");
  const width = attribute("width");
  const height = attribute("height");
  const fill = attribute("fill");
  const overflow = attribute("overflow");
  if (!viewBox || !width || !height || !fill || !overflow) return null;

  let innerMarkup = svg.slice(openingTag.length, closingTag);
  const bubiGroup = innerMarkup.match(/(<g\b[^>]*\bid="Bubi[^"]*"[^>]*)(>)/i);
  if (!bubiGroup) return null;
  innerMarkup = innerMarkup.replace(bubiGroup[0], `${bubiGroup[1]} class="bubi-part bubi-part--head"${bubiGroup[2]}`);

  for (const [part, ids] of Object.entries(armAnatomy[emotion]) as [Exclude<BubiPart, "head">, readonly string[]][]) {
    for (const id of ids) {
      const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const element = new RegExp(`(<(?:g|path)\\b[^>]*\\bid="${escapedId}"[^>]*)(>)`, "i");
      let found = false;
      innerMarkup = innerMarkup.replace(element, (_match, start: string, end: string) => {
        found = true;
        return `${start} class="bubi-part bubi-part--${part}"${end}`;
      });
      if (!found) return null;
    }
  }

  return { width, height, viewBox, fill, overflow, innerMarkup };
}

export function namespaceBubiArtwork(artwork: PreparedArtwork, prefix: string): PreparedArtwork {
  const ids = new Map<string, string>();
  let innerMarkup = artwork.innerMarkup.replace(/\bid="([^"]+)"/g, (_match, id: string) => {
    const namespacedId = `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    ids.set(id, namespacedId);
    return `id="${namespacedId}"`;
  });

  for (const [id, namespacedId] of ids) {
    innerMarkup = innerMarkup
      .replaceAll(`href="#${id}"`, `href="#${namespacedId}"`)
      .replaceAll(`url(#${id})`, `url(#${namespacedId})`)
      .replaceAll(`url("#${id}")`, `url("#${namespacedId}")`)
      .replaceAll(`url('#${id}')`, `url('#${namespacedId}')`);
  }

  return { ...artwork, innerMarkup };
}

function loadArtwork(emotion: Emotion): Promise<PreparedArtwork | null> {
  const cached = artworkCache.get(emotion);
  if (cached) return cached;

  const request = fetch(artworks[emotion], { cache: "force-cache" })
    .then((response) => (response.ok ? response.text() : null))
    .then((svg) => (svg ? prepareBubiArtwork(svg, emotion) : null))
    .catch(() => null);
  artworkCache.set(emotion, request);
  return request;
}

type BubiMascotProps = {
  emotion?: Emotion;
  animation?: Animation;
  availableAnimations?: readonly Animation[];
  animationKey?: string | number;
  className?: string;
  label?: string;
  decorative?: boolean;
};

export function BubiMascot({ emotion = "idle", animation, availableAnimations, animationKey, className, label, decorative = false }: BubiMascotProps) {
  const currentEmotion = getBubiArtwork(emotion);
  const motion = getBubiMotion(animation, availableAnimations);
  const instancePrefix = `bubi-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [loaded, setLoaded] = useState<{ requestedEmotion: Emotion; artworkEmotion: Emotion; artwork: PreparedArtwork } | null>(null);
  const activeLoad = loaded?.requestedEmotion === currentEmotion ? loaded : null;
  const activeArtwork = useMemo(
    () => activeLoad ? namespaceBubiArtwork(activeLoad.artwork, instancePrefix) : null,
    [activeLoad, instancePrefix],
  );

  useEffect(() => {
    let active = true;
    void loadArtwork(currentEmotion).then((artwork) => {
      if (active && artwork) {
        setLoaded({ requestedEmotion: currentEmotion, artworkEmotion: currentEmotion, artwork });
        return;
      }
      if (active && currentEmotion !== "idle") {
        void loadArtwork("idle").then((fallback) => {
          if (active && fallback) setLoaded({ requestedEmotion: currentEmotion, artworkEmotion: "idle", artwork: fallback });
        });
      }
    });
    return () => {
      active = false;
    };
  }, [currentEmotion]);

  const artworkName = activeLoad?.artworkEmotion ?? currentEmotion;
  const accessibleName = label ?? `Bubi ${emotionNames[artworkName]}`;
  return (
    <span className="bubi-mascot-motion" data-emotion={currentEmotion} data-expression={artworkName}>
      <span className="bubi-mascot-motion__pose" data-motion={motion} data-motion-fallback={activeArtwork ? undefined : "still"} key={getBubiPlaybackKey(animationKey, currentEmotion, motion)}>
        {activeArtwork ? (
          <svg
            aria-hidden={decorative || undefined}
            aria-label={decorative ? undefined : accessibleName}
            className={cn("bubi-mascot-art h-14 w-auto", className)}
            data-bubi-artwork={artworkName}
            data-renderer="inline-svg"
            fill={activeArtwork.fill}
            focusable="false"
            height={activeArtwork.height}
            overflow={activeArtwork.overflow}
            preserveAspectRatio="none"
            role={decorative ? undefined : "img"}
            viewBox={activeArtwork.viewBox}
            width={activeArtwork.width}
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            dangerouslySetInnerHTML={{ __html: activeArtwork.innerMarkup }}
          />
        ) : (
          <img
            alt={decorative ? "" : accessibleName}
            aria-hidden={decorative || undefined}
            className={cn("bubi-mascot-art h-14 w-auto", className)}
            data-bubi-artwork={currentEmotion}
            data-fallback-label="Bubi tenang"
            data-fallback-src={artworks.idle}
            data-renderer="image-fallback"
            onError={(event) => {
              const image = event.currentTarget;
              if (image.dataset.fallback === "true" || image.getAttribute("src") === artworks.idle) return;
              image.dataset.fallback = "true";
              image.alt = image.dataset.fallbackLabel ?? "";
              image.src = artworks.idle;
            }}
            src={artworks[currentEmotion]}
          />
        )}
      </span>
    </span>
  );
}
