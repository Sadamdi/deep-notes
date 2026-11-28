const celebrationStorageKey = "deep-notes:streak-celebration";

type CelebrationMarker = { date: string; days: number };

export function streakWasExtended(previousDays: number | undefined, currentDays: number | undefined) {
  return previousDays !== undefined && currentDays !== undefined && currentDays > previousDays;
}

export function queueStreakCelebration(days: number) {
  if (typeof window === "undefined") return;
  try {
    const marker: CelebrationMarker = { date: new Date().toISOString().slice(0, 10), days };
    window.sessionStorage.setItem(celebrationStorageKey, JSON.stringify(marker));
  } catch {
    // Storage can be disabled; streak data remains visible without the animation.
  }
}

export function consumeStreakCelebration(days: number) {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.sessionStorage.getItem(celebrationStorageKey);
    if (!stored) return false;
    window.sessionStorage.removeItem(celebrationStorageKey);
    const marker = JSON.parse(stored) as Partial<CelebrationMarker>;
    return marker.date === new Date().toISOString().slice(0, 10) && marker.days === days;
  } catch {
    try {
      window.sessionStorage.removeItem(celebrationStorageKey);
    } catch {
      return false;
    }
    return false;
  }
}
