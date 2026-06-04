// Deterministic mock data so the app always renders, even offline / before the
// backend or DB is reachable. Derived from the real QC GeoJSON and the real EDSA
// busway station coordinates -- not random, so it is stable across reloads.

import qcBarangays from "@/geojson/qc_barangays.geojson";
import {
  EDSA_STATIONS,
  hash01,
  deriveGeoUnits,
  deriveStations,
  derivePassages,
} from "./derive.mjs";

export { EDSA_STATIONS };

let _geounits = null;
export function mockGeoUnits() {
  if (!_geounits) _geounits = deriveGeoUnits(qcBarangays.features);
  return _geounits;
}

export function mockStations() {
  return deriveStations();
}

export function mockPassages() {
  return derivePassages();
}

// EDSA route polyline (station centroids, densified a touch).
export function mockRoute() {
  return EDSA_STATIONS.map((s) => ({ latitude: s.lat, longitude: s.lon }));
}

const DAYS = (() => {
  const out = [];
  const start = new Date("2023-07-07T00:00:00Z");
  for (let i = 0; i < 22; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    out.push(d.toISOString());
  }
  return out;
})();

export function mockPassengerLoad() {
  const out = [];
  DAYS.forEach((ts, i) => {
    const base = 1200 + Math.round(380 * Math.sin(i / 3) + 120 * hash01(ts));
    out.push({ timestamp: ts, route: "Northbound", passengerLoad: base });
    out.push({
      timestamp: ts,
      route: "Southbound",
      passengerLoad: Math.round(base * (0.82 + 0.2 * hash01(ts + "s"))),
    });
  });
  return out;
}

export function mockBoardingAlightingBar() {
  const out = [];
  DAYS.forEach((day, di) => {
    [7, 12, 17, 20].forEach((hr) => {
      const peak = hr === 7 || hr === 17 ? 1 : 0.5;
      const ts = new Date(day);
      ts.setUTCHours(hr);
      out.push({
        timestamp: ts.toISOString(),
        totalBoarding: Math.round(180 * peak + 90 * hash01(`${di}${hr}b`)),
        totalAlighting: Math.round(160 * peak + 90 * hash01(`${di}${hr}a`)),
      });
    });
  });
  return out;
}

export function mockBoardingAlightingHeatmap() {
  const out = [];
  EDSA_STATIONS.forEach((s, i) => {
    const n = 6 + Math.round(hash01(s.name) * 10);
    for (let k = 0; k < n; k++) {
      const jit = (h) => (hash01(s.name + h + k) - 0.5) * 0.004;
      out.push({
        timestamp: DAYS[k % DAYS.length],
        latitude: s.lat + jit("la"),
        longitude: s.lon + jit("lo"),
        boarding: k % 2 === 0,
        alighting: k % 2 !== 0,
      });
    }
  });
  return out;
}

export function mockGps() {
  const out = [];
  EDSA_STATIONS.forEach((s, i) => {
    const next = EDSA_STATIONS[i + 1] || s;
    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      out.push({
        timestamp: DAYS[k % DAYS.length],
        latitude: s.lat + (next.lat - s.lat) * t,
        longitude: s.lon + (next.lon - s.lon) * t,
        gpsSpeed: 6 + Math.round(13 * hash01(`${i}${k}spd`)),
      });
    }
  });
  return out;
}

export function mockGpsSpeedLine() {
  return DAYS.map((ts, i) => ({
    timestamp: ts,
    speed: Number((14 + 6 * Math.sin(i / 2.5) + 3 * hash01(ts + "v")).toFixed(1)),
  }));
}

export const MOCK_INSIGHTS = {
  insights: [
    {
      title: "Fringe barangays trail the core on access",
      description:
        "Pedestrian-priority scores rise toward the city edges, where barangays sit farther from EDSA busway stations and have fewer safe crossings. These areas should lead the funding queue.",
    },
    {
      title: "Crossing density tracks safety, not just proximity",
      description:
        "Areas near a station but with few footbridges or signalized crossings still score high priority. Proximity alone does not equal access; safe passage matters.",
    },
    {
      title: "Speed dips mark congestion, not demand",
      description:
        "Mid-corridor segments show the lowest busway speeds, suggesting signal and intersection bottlenecks rather than raw passenger volume. Target operations, not capacity.",
    },
  ],
  variables: [
    {
      attributeName: "Station Proximity",
      usage:
        "Walking distance from each barangay centroid to the nearest busway station; the strongest driver of the priority score.",
    },
    {
      attributeName: "Crossing Density",
      usage:
        "Count of pedestrian footbridges and crossings per area; modulates the proximity signal toward real-world safe access.",
    },
    {
      attributeName: "Population",
      usage:
        "Resident count per barangay; weights priority so interventions reach more people per peso.",
    },
  ],
  suggestedPrompts: [
    "Which barangays should get sidewalks first?",
    "How does crossing density affect the score?",
    "Where are the worst busway speed dips?",
  ],
};

export const MOCK_POLICY = {
  response:
    "**Policy recommendation #1**: Prioritize safe crossings in high-score fringe barangays\n\n**Description:** Allocate the first tranche of the pedestrian infrastructure budget to footbridges and signalized crossings in barangays scoring above 70, concentrated on the city's northern and eastern edges.\n\n**Rationale:** These areas combine long walking distances to busway stations with low crossing density. Adding safe passage there closes the largest access gaps per peso, following the proximity and crossing-density findings.\n\n**Policy recommendation #2**: Fix mid-corridor busway bottlenecks before adding capacity\n\n**Description:** Re-time signals and clear intersection conflicts at the central EDSA segments showing the lowest recorded speeds, ahead of any fleet expansion.\n\n**Rationale:** Speed dips there reflect operational friction rather than demand, so operations fixes restore reliability at a fraction of capacity-expansion cost.",
};
