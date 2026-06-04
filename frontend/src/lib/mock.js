// Deterministic mock data so the app always renders, even offline / before the
// backend or DB is reachable. Derived from the real QC GeoJSON and the real EDSA
// busway station coordinates -- not random, so it is stable across reloads.

import qcBarangays from "@/geojson/qc_barangays.geojson";

// Real EDSA busway stations (north -> south).
export const EDSA_STATIONS = [
  { name: "Monumento", lat: 14.65916384111359, lon: 120.98573142941851 },
  { name: "Bagong Barrio", lat: 14.659828134168453, lon: 120.99912101589535 },
  { name: "Roosevelt", lat: 14.658167397753804, lon: 121.01748878195974 },
  { name: "North Avenue", lat: 14.65318511296888, lon: 121.03413993437326 },
  { name: "Quezon Ave", lat: 14.644714968865955, lon: 121.0391181139608 },
  { name: "Nepa-Q Mart", lat: 14.631593903622614, lon: 121.04701453675483 },
  { name: "Main Ave", lat: 14.616977109846092, lon: 121.06160575278732 },
  { name: "Santolan", lat: 14.609982696962746, lon: 121.05787574923397 },
  { name: "Ortigas", lat: 14.589832685829805, lon: 121.05716125602541 },
  { name: "Guadalupe", lat: 14.57101110076029, lon: 121.05032201969453 },
  { name: "Buendia", lat: 14.558856285663646, lon: 121.03502097922416 },
  { name: "Ayala", lat: 14.552848486249191, lon: 121.03328878610569 },
  { name: "Tramo", lat: 14.540273493066225, lon: 121.01077027556548 },
  { name: "Taft", lat: 14.5412515737729, lon: 120.99979971914846 },
  { name: "Diosdado Macapagal Blvd", lat: 14.540133766897473, lon: 120.99287094667456 },
  { name: "PITX/MOA", lat: 14.537339224963862, lon: 120.98377693280254 },
];

// Stable string hash -> [0,1)
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function centroid(coords) {
  // coords: Polygon rings
  const ring = coords[0] || [];
  let x = 0,
    y = 0;
  ring.forEach(([lon, lat]) => {
    x += lon;
    y += lat;
  });
  const n = ring.length || 1;
  return [x / n, y / n];
}

// Barangays scored by pedestrian-mobility priority. Distance from the city
// core (Quezon Ave / North Ave) lightly raises priority on the fringes, plus a
// stable per-name component so the choropleth reads as real, varied data.
let _geounits = null;
export function mockGeoUnits() {
  if (_geounits) return _geounits;
  const core = [121.043, 14.648];
  _geounits = qcBarangays.features
    .filter((f) => f.geometry && f.geometry.type === "Polygon")
    .map((f) => {
      const name = f.properties?.name || "Unknown";
      const [cx, cy] = centroid(f.geometry.coordinates);
      const dist = Math.hypot(cx - core[0], cy - core[1]);
      const distNorm = Math.min(1, dist / 0.09);
      const score = Math.min(
        0.97,
        Math.max(0.05, 0.32 * distNorm + 0.62 * hash01(name) + 0.06)
      );
      const population = 8000 + Math.round(hash01(name + "p") * 52000);
      const passages = 1 + Math.round(hash01(name + "x") * 11);
      // Three sub-scores (0..1). Accessibility tracks the priority signal
      // inversely (high priority = low accessibility); safety and mobility add
      // stable per-name variation so the layer toggle reads as distinct data.
      const accessibilityScore = Number(
        Math.min(0.98, Math.max(0.08, 1 - score * 0.85 + (hash01(name + "a") - 0.5) * 0.18)).toFixed(3)
      );
      const safetyScore = Number(
        Math.min(0.98, Math.max(0.08, 0.5 + (hash01(name + "sf") - 0.5) * 0.8 - score * 0.25)).toFixed(3)
      );
      const mobilityScore = Number(
        Math.min(0.98, Math.max(0.08, 0.55 + (hash01(name + "mb") - 0.5) * 0.7 - score * 0.2)).toFixed(3)
      );
      return {
        _id: f.properties?.["@id"] || name,
        name,
        proximityScore: Number(score.toFixed(3)),
        accessibilityScore,
        safetyScore,
        mobilityScore,
        population,
        area: Number((0.4 + hash01(name + "ar") * 3).toFixed(2)),
        passageCount: passages,
        postalCode: f.properties?.postal_code || null,
        roadsWithin: { roads: [], roadLength: 0 },
        sidewalksWithin: { sidewalks: [], sidewalkLength: 0 },
        location: f.geometry,
        centroid: [cy, cx],
      };
    });
  return _geounits;
}

export function mockStations() {
  return EDSA_STATIONS.map((s, i) => ({
    _id: `edsa-${i}`,
    id: `edsa-${i}`,
    name: s.name,
    line: "EDSA Busway",
    transportType: ["bus"],
    location: { type: "Point", coordinates: [s.lon, s.lat] },
  }));
}

export function mockPassages() {
  // Pedestrian crossings sampled along the EDSA corridor between stations.
  const out = [];
  for (let i = 0; i < EDSA_STATIONS.length - 1; i++) {
    const a = EDSA_STATIONS[i];
    const b = EDSA_STATIONS[i + 1];
    const steps = 2;
    for (let k = 1; k <= steps; k++) {
      const t = k / (steps + 1);
      out.push({
        _id: `pass-${i}-${k}`,
        osm_id: `pass-${i}-${k}`,
        type: hash01(`${i}${k}`) > 0.5 ? "footbridge" : "crossing",
        location: {
          type: "Point",
          coordinates: [
            a.lon + (b.lon - a.lon) * t,
            a.lat + (b.lat - a.lat) * t,
          ],
        },
      });
    }
  }
  return out;
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
