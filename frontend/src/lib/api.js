// Single data access point. Hits the Next API routes (same origin /api by
// default) and falls back to deterministic mock data so the UI always renders,
// even with no backend, no DB, or no network. The fallback is explicit per
// endpoint, never a silent empty response.

import {
  mockGeoUnits,
  mockStations,
  mockPassages,
  mockPassengerLoad,
  mockBoardingAlightingBar,
  mockBoardingAlightingHeatmap,
  mockGps,
  mockGpsSpeedLine,
  MOCK_INSIGHTS,
  MOCK_POLICY,
} from "./mock";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

// Metro Manila fallback data is large, so load it lazily (separate chunk, only
// fetched if a live request fails). Falls back to the QC-derived data if the
// bundled NCR dataset is unavailable for any reason.
const ncr = (file, derived) => async () => {
  try {
    return (await import(`@/data/${file}.json`)).default;
  } catch {
    return derived();
  }
};

const FALLBACKS = {
  "/gis/geounits": ncr("ncr-geounits", mockGeoUnits),
  "/gis/stations": ncr("ncr-stations", mockStations),
  "/gis/passages": ncr("ncr-passages", mockPassages),
  "/gis/pois": ncr("ncr-pois", () => []),
  "/dashboard/passenger-load": () => mockPassengerLoad(),
  "/dashboard/boarding-alighting-bar": () => mockBoardingAlightingBar(),
  "/dashboard/boarding-alighting-heatmap": () => mockBoardingAlightingHeatmap(),
  "/dashboard/gps-data": () => mockGps(),
  "/dashboard/gps-speed-line": () => mockGpsSpeedLine(),
  "/insights": () => MOCK_INSIGHTS,
  "/policy": () => MOCK_POLICY,
  "/overview-insights": (s) => ({
    summary: `Across ${s?.totalBarangays || 0} barangays in ${s?.cities || 0} Metro Manila cities, pedestrian-access priority concentrates on areas far from rail and busway stations.`,
    insights: [
      { title: "Priority follows the transit gap", detail: "The highest-priority barangays cluster where walking distance to the nearest station is longest." },
      { title: "Coverage is uneven across cities", detail: "Average priority varies widely between LGUs, so budget should be weighted toward the worst-access cities." },
      { title: "Safe crossings lag behind proximity", detail: "Some areas sit near a station yet score poorly, pointing to missing crossings rather than distance." },
    ],
    actions: [
      { priority: 1, title: "Fund last-mile footways in the top-priority fringe barangays", detail: "Continuous, accessible sidewalks where station distance is greatest." },
      { priority: 2, title: "Add protected crossings near high-traffic stations", detail: "Footbridges and signalized crossings where foot traffic meets fast roads." },
      { priority: 3, title: "Weight the budget by city-level access gaps", detail: "Allocate proportionally to each city's average priority." },
    ],
    offline: true,
  }),
  "/recommend": (body) => {
    const scores = [
      { k: "accessibility", v: body?.accessibilityScore ?? 1 },
      { k: "safety", v: body?.safetyScore ?? 1 },
      { k: "mobility", v: body?.mobilityScore ?? 1 },
    ].sort((a, c) => a.v - c.v);
    const lib = {
      accessibility: {
        title: "Add ramped, shaded footways to the nearest station",
        detail:
          "Close the last-mile gap with continuous, accessible sidewalks and curb ramps.",
      },
      safety: {
        title: "Install signalized crossings at high-conflict intersections",
        detail:
          "Add pedestrian-protected phases and refuge islands where foot traffic meets fast traffic.",
      },
      mobility: {
        title: "Introduce a feeder or shared-mobility link",
        detail:
          "Connect the barangay interior to the corridor to cut walking distance.",
      },
    };
    return {
      summary: `${body?.name || "This area"} scores lowest on ${scores[0].k}.`,
      actions: scores.map((s, i) => ({ priority: i + 1, ...lib[s.k] })),
      offline: true,
    };
  },
  "/chat": (body) => ({
    response:
      "I'm running in offline mode right now, so this is a sample answer. Connect the backend (OpenRouter key + MongoDB) to get live, document-grounded responses about pedestrian mobility, busway operations, and transport policy.",
    offline: true,
  }),
};

// Result shape: { data, source: "live" | "mock", error? }
export async function apiPost(path, body = {}, { timeoutMs = 12000 } = {}) {
  const fallback = FALLBACKS[path];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data, source: "live" };
  } catch (err) {
    if (fallback) {
      return { data: await fallback(body), source: "mock", error: err.message };
    }
    throw err;
  }
}
