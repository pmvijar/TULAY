// Shared priority-score language for TULAY.
// A score in [0,1] expresses how urgently an area needs pedestrian-mobility
// intervention. Low = adequate (calm green). High = urgent (deep red).
// This is the one place a full sequential palette is allowed (it IS the data).

export const PRIORITY_STOPS = [
  "var(--p0)",
  "var(--p1)",
  "var(--p2)",
  "var(--p3)",
  "var(--p4)",
  "var(--p5)",
];

// Concrete OKLCH values, for Leaflet / canvas where CSS vars are not available.
export const PRIORITY_OKLCH = [
  "oklch(0.78 0.12 150)",
  "oklch(0.80 0.11 110)",
  "oklch(0.84 0.13 85)",
  "oklch(0.78 0.15 55)",
  "oklch(0.66 0.19 33)",
  "oklch(0.55 0.21 27)",
];

const clamp01 = (n) => Math.min(Math.max(Number(n) || 0, 0), 1);

// Returns one of 5 priority bands for a [0,1] score.
export function scoreBand(score) {
  const s = clamp01(score);
  const idx = Math.min(PRIORITY_OKLCH.length - 1, Math.floor(s * 6));
  return idx;
}

export function scoreColor(score) {
  return PRIORITY_OKLCH[scoreBand(score)];
}

export function scoreLabel(score) {
  const s = clamp01(score);
  if (s < 0.2) return "adequate";
  if (s < 0.4) return "low priority";
  if (s < 0.6) return "moderate";
  if (s < 0.8) return "high priority";
  return "critical";
}

// 0–100 display form.
export function scoreDisplay(score) {
  return Math.round(clamp01(score) * 100);
}

// Quality scale: low = poor (red), high = good (green). Used for the
// accessibility / safety / mobility sub-scores where higher is better.
export function qualityColor(score) {
  const s = clamp01(score);
  if (s >= 0.8) return "oklch(0.62 0.14 152)";
  if (s >= 0.6) return "oklch(0.70 0.14 130)";
  if (s >= 0.4) return "oklch(0.78 0.15 85)";
  if (s >= 0.2) return "oklch(0.70 0.17 45)";
  return "oklch(0.585 0.20 27)";
}

export function qualityLabel(score) {
  const s = clamp01(score);
  if (s >= 0.8) return "excellent";
  if (s >= 0.6) return "good";
  if (s >= 0.4) return "fair";
  if (s >= 0.2) return "poor";
  return "critical";
}
