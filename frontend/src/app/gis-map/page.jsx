"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import * as turf from "@turf/turf";
import { MapPin, Radius } from "lucide-react";
import "leaflet/dist/leaflet.css";

import { AppShell } from "@/components/shell/AppShell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { scoreColor, scoreLabel } from "@/lib/scoring";
import { apiPost } from "@/lib/api";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), {
  ssr: false,
});
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), {
  ssr: false,
});

// Coverage rings, retimed to brand status tokens (near = good, far = poor).
const RING = {
  near: "oklch(0.62 0.14 152)",
  medium: "oklch(0.74 0.15 78)",
  far: "oklch(0.585 0.20 27)",
};

export default function TransitCoveragePage() {
  const [layers, setLayers] = useState([]);
  const [geoUnits, setGeoUnits] = useState([]);
  const [stations, setStations] = useState([]);
  const [source, setSource] = useState("live");
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [g, s, p] = await Promise.all([
        apiPost("/gis/geounits", { location: "EDSA" }),
        apiPost("/gis/stations", { location: "EDSA" }),
        apiPost("/gis/passages", { location: "EDSA" }),
      ]);
      setGeoUnits(Array.isArray(g.data) ? g.data : []);
      setStations(Array.isArray(s.data) ? s.data : []);
      setSource(g.source);
      setIsLoading(false);
    })();
  }, []);

  // Station catchment buffers (near 0.4km / medium 0.8km / far 1.2km), unioned.
  useEffect(() => {
    if (!stations.length) return;
    const dist = { near: 0.4, medium: 0.8, far: 1.2 };
    const buffers = { near: [], medium: [], far: [] };
    stations.forEach((st) => {
      const c = st.location?.coordinates;
      if (!c) return;
      Object.keys(dist).forEach((k) => {
        buffers[k].push(turf.buffer(turf.point(c), dist[k], { units: "kilometers" }));
      });
    });
    const union = (arr) =>
      arr.length > 1 ? turf.union(turf.featureCollection(arr)) : arr[0];

    const ringLayer = (data, color) => ({
      data,
      style: { color, fillColor: color, fillOpacity: 0.14, opacity: 0, weight: 0 },
    });

    try {
      const rings = [
        ringLayer(union(buffers.far), RING.far),
        ringLayer(union(buffers.medium), RING.medium),
        ringLayer(union(buffers.near), RING.near),
      ].filter((l) => l.data);
      setLayers(rings);
    } catch (err) {
      console.error("buffer union failed:", err.message);
      setLayers([]);
    }
  }, [stations]);

  // Barangay choropleth as a single layer (scales to ~800+ areas).
  const fc = useMemo(
    () => ({
      type: "FeatureCollection",
      features: geoUnits.map((u) => ({
        type: "Feature",
        properties: { _id: u._id, name: u.name, city: u.city },
        geometry: u.location,
      })),
    }),
    [geoUnits]
  );
  const byId = useMemo(() => {
    const m = {};
    geoUnits.forEach((u) => (m[u._id] = u));
    return m;
  }, [geoUnits]);
  const styleFn = (feature) => ({
    color: "oklch(0.62 0.012 264 / 0.45)",
    weight: 0.5,
    fillColor: scoreColor(byId[feature.properties._id]?.proximityScore ?? 0),
    fillOpacity: 0.3,
  });
  const onEachFeature = (feature, layer) => {
    layer.bindTooltip(feature.properties.name, { sticky: true });
    layer.on("click", () => setSelected(byId[feature.properties._id]));
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AppShell>
      <div className="absolute inset-0">
        {!isLoading && (
          <MapContainer
            center={[14.58, 121.0]}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap &copy; CARTO"
            />
            {layers.map((layer, i) => (
              <GeoJSON key={"ring-" + i} data={layer.data} style={layer.style} />
            ))}
            {fc.features.length > 0 && (
              <GeoJSON
                key={fc.features.length}
                data={fc}
                style={styleFn}
                onEachFeature={onEachFeature}
              />
            )}
            {selected?.location && (
              <GeoJSON
                key={"sel-" + selected._id}
                data={selected.location}
                style={{
                  color: "oklch(0.5 0.18 258)",
                  weight: 3,
                  fillColor: scoreColor(selected.proximityScore),
                  fillOpacity: 0.42,
                }}
              />
            )}
          </MapContainer>
        )}
      </div>

      {/* Header */}
      <GlassPanel className="absolute left-6 top-6 z-[500] w-[320px] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Metro Manila
          </div>
          <StatusBadge
            status={source === "live" ? "live" : "offline"}
            label={source === "live" ? "Live" : "Mock data"}
          />
        </div>
        <h1 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight">
          <Radius className="h-5 w-5 text-accent" />
          Transit coverage
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Walking catchment around busway and rail stations, over barangays
          shaded by pedestrian-access priority. Select an area for its score.
        </p>
      </GlassPanel>

      {/* Legend */}
      <GlassPanel className="absolute bottom-6 right-6 z-[500] w-[230px] px-4 py-3.5">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Station catchment
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            { c: RING.near, l: "Near", d: "under 400 m" },
            { c: RING.medium, l: "Medium", d: "400 to 800 m" },
            { c: RING.far, l: "Far", d: "800 m to 1.2 km" },
          ].map((r) => (
            <div key={r.l} className="flex items-center gap-2 text-[12px]">
              <span
                className="h-3 w-3 rounded-[4px]"
                style={{ background: r.c, opacity: 0.55 }}
              />
              <span className="font-medium">{r.l}</span>
              <span className="ml-auto text-muted-foreground">{r.d}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-2.5">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Area priority
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Adequate</span>
            <div
              className="h-2 flex-1 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.78 0.12 150), oklch(0.84 0.13 85), oklch(0.55 0.21 27))",
              }}
            />
            <span>Critical</span>
          </div>
        </div>
      </GlassPanel>

      {/* Drill-in */}
      {selected && (
        <GlassPanel className="absolute right-6 top-6 z-[600] w-[300px] p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Barangay
              </div>
              <h2 className="mt-0.5 text-[18px] font-semibold tracking-tight">
                {selected.name}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ScoreBadge score={selected.proximityScore} />
            <span className="text-[13px] capitalize text-muted-foreground">
              {scoreLabel(selected.proximityScore)} priority
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            {selected.proximityScore >= 0.6
              ? "Sits largely outside comfortable station catchment. A strong candidate for new crossings or feeder access."
              : "Reasonably served by nearby stations. Lower in the intervention queue."}
          </p>
          {selected.population != null && (
            <div className="mt-4 flex gap-5 border-t border-border pt-3">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Population
                </span>
                <span className="nums text-[16px] font-semibold">
                  {selected.population.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Crossings
                </span>
                <span className="nums text-[16px] font-semibold">
                  {selected.passageCount ?? "—"}
                </span>
              </div>
            </div>
          )}
        </GlassPanel>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <span className="text-sm font-medium text-muted-foreground">
            Loading coverage…
          </span>
        </div>
      )}
    </AppShell>
  );
}
