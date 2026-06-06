// Pure derivation of TULAY's GIS entities from the QC GeoJSON + EDSA station
// coordinates. Imported by both the client mock (lib/mock.js) and the DB seed
// (scripts/seed.mjs) so live data and offline fallback are byte-identical.

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

export function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function centroid(coords) {
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

export function deriveGeoUnits(features) {
  const core = [121.043, 14.648];
  return features
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
}

export function deriveStations() {
  return EDSA_STATIONS.map((s, i) => ({
    _id: `edsa-${i}`,
    id: `edsa-${i}`,
    name: s.name,
    line: "EDSA Busway",
    transportType: ["bus"],
    location: { type: "Point", coordinates: [s.lon, s.lat] },
  }));
}

export function derivePassages() {
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
          coordinates: [a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t],
        },
      });
    }
  }
  return out;
}
