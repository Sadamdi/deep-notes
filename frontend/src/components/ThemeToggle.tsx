import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "dn-theme";

function readSavedTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Ignore storage access errors in restricted browsing contexts.
  }
  return "light";
}

function writeDomTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function applyInitialTheme() {
  writeDomTheme(readSavedTheme());
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => readSavedTheme());

  useEffect(() => {
    writeDomTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage access errors in restricted browsing contexts.
    }
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex min-h-11 items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-2 text-left text-xs font-bold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:opacity-90 ${className}`}
    >
      <span>Tema tampilan</span>
      <span className="rounded bg-card px-2 py-0.5 text-[11px] font-bold text-foreground">
        {isDark ? "Gelap" : "Terang"}
      </span>
    </button>
  );
}
