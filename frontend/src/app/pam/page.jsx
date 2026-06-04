"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import ReactDOMServer from "react-dom/server";
import {
  Search,
  X,
  Move,
  TriangleAlert,
  PersonStanding,
  BusFront,
  TrainFront,
  Footprints,
  MapPin,
  Layers,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

import { AppShell } from "@/components/shell/AppShell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "@/components/ui/score-bar";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { qualityColor } from "@/lib/scoring";
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
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});

const LAYERS = [
  { value: "accessibility", label: "Accessibility", icon: PersonStanding },
  { value: "safety", label: "Safety", icon: TriangleAlert },
  { value: "mobility", label: "Mobility", icon: Move },
];

const SCORE_KEY = {
  accessibility: "accessibilityScore",
  safety: "safetyScore",
  mobility: "mobilityScore",
};

function makeIcon(L, Comp, ring) {
  return L.divIcon({
    className: "tulay-div-icon",
    html: ReactDOMServer.renderToString(
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 9999,
          background: "oklch(0.995 0.003 258 / 0.92)",
          border: `1.5px solid ${ring}`,
          boxShadow: "0 4px 12px -4px oklch(0.4 0.03 264 / 0.4)",
        }}
      >
        <Comp width={16} height={16} color={ring} />
      </div>
    ),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function AccessibilityMapPage() {
  const [geoUnits, setGeoUnits] = useState([]);
  const [stations, setStations] = useState([]);
  const [passages, setPassages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState("live");
  const [activeLayer, setActiveLayer] = useState("accessibility");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  const [icons, setIcons] = useState({});
  useEffect(() => {
    let active = true;
    import("leaflet").then((mod) => {
      const L = mod.default || mod;
      if (!active) return;
      setIcons({
        bus: makeIcon(L, BusFront, "oklch(0.555 0.175 258)"),
        train: makeIcon(L, TrainFront, "oklch(0.5 0.18 280)"),
        passage: makeIcon(L, Footprints, "oklch(0.62 0.14 152)"),
      });
    });
    return () => {
      active = false;
    };
  }, []);

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
      setPassages(Array.isArray(p.data) ? p.data : []);
      setSource(g.source);
      setIsLoading(false);
    })();
  }, []);

  const scoreOf = (unit) =>
    unit?.[SCORE_KEY[activeLayer]] ?? unit?.proximityScore ?? 0;

  const features = useMemo(
    () =>
      geoUnits.map((u) => ({
        type: "Feature",
        properties: { ...u, type: "geounit" },
        geometry: u.location,
      })),
    [geoUnits]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...geoUnits].sort(
      (a, b) => scoreOf(b) - scoreOf(a)
    );
    if (!q) return list;
    return list.filter((u) => u.name?.toLowerCase().includes(q));
  }, [geoUnits, query, activeLayer]);

  const dedupStations = useMemo(() => {
    const seen = new Set();
    return stations.filter((s) => {
      if (!s.name || s.name === "N/A" || seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  }, [stations]);

  return (
    <AppShell>
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        {!isLoading && (
          <MapContainer
            center={[14.63, 121.04]}
            zoom={13}
            zoomControl={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            {features.map((f) => {
              const score = scoreOf(f.properties);
              const isSel = selected?._id === f.properties._id;
              return (
                <GeoJSON
                  key={f.properties._id + activeLayer}
                  data={f}
                  style={{
                    color: isSel
                      ? "oklch(0.555 0.175 258)"
                      : "oklch(0.86 0.009 258)",
                    weight: isSel ? 2.5 : 0.8,
                    fillColor: qualityColor(score),
                    fillOpacity: isSel ? 0.62 : 0.45,
                  }}
                  eventHandlers={{
                    click: () => setSelected({ ...f.properties }),
                  }}
                >
                  <Tooltip sticky>{f.properties.name}</Tooltip>
                </GeoJSON>
              );
            })}

            {activeLayer === "mobility" &&
              dedupStations.map((s) => (
                <Marker
                  key={s._id}
                  position={[
                    s.location.coordinates[1],
                    s.location.coordinates[0],
                  ]}
                  icon={
                    s.transportType?.[0] === "train" ? icons.train : icons.bus
                  }
                  eventHandlers={{
                    click: () => setSelected({ ...s, type: "station" }),
                  }}
                >
                  <Tooltip>{s.name}</Tooltip>
                </Marker>
              ))}

            {activeLayer === "safety" &&
              passages.map((p) => (
                <Marker
                  key={p._id}
                  position={[
                    p.location.coordinates[1],
                    p.location.coordinates[0],
                  ]}
                  icon={icons.passage}
                >
                  <Tooltip className="capitalize">{p.type}</Tooltip>
                </Marker>
              ))}
          </MapContainer>
        )}
      </div>

      {/* Header / breadcrumb */}
      <GlassPanel className="absolute left-6 top-6 z-[500] w-[340px] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Quezon City
            <span className="text-border-strong">/</span>
            EDSA corridor
          </div>
          <StatusBadge
            status={source === "live" ? "live" : "offline"}
            label={source === "live" ? "Live" : "Mock data"}
          />
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight">
          Accessibility map
        </h1>
        <p className="mb-4 mt-0.5 text-[13px] text-muted-foreground">
          Barangays shaded by {activeLayer}. Select an area for its full profile.
        </p>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a barangay"
            className="h-10 w-full rounded-md border border-border bg-surface/80 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="mt-2 max-h-[260px] space-y-0.5 overflow-y-auto pr-1">
          {filtered.slice(0, 60).map((u) => {
            const score = scoreOf(u);
            const isSel = selected?._id === u._id;
            return (
              <button
                key={u._id}
                onClick={() => setSelected({ ...u })}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
                  isSel ? "bg-accent-soft" : "hover:bg-surface-muted"
                )}
              >
                <span className="truncate text-[13px] font-medium">
                  {u.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.round(score * 100)}%`,
                        background: qualityColor(score),
                      }}
                    />
                  </span>
                  <span
                    className="nums w-7 text-right text-[12px] font-semibold"
                    style={{ color: qualityColor(score) }}
                  >
                    {Math.round(score * 100)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </GlassPanel>

      {/* Layer switch */}
      <GlassPanel className="absolute bottom-6 left-6 z-[500] p-1.5">
        <div className="flex items-center gap-1">
          <span className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Layers className="mr-1 inline h-3.5 w-3.5" />
            Layer
          </span>
          {LAYERS.map((l) => {
            const Icon = l.icon;
            const active = activeLayer === l.value;
            return (
              <button
                key={l.value}
                onClick={() => setActiveLayer(l.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ease-out-quint",
                  active
                    ? "bg-accent text-accent-fg shadow-sm"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </button>
            );
          })}
        </div>
      </GlassPanel>

      {/* Legend */}
      <GlassPanel className="absolute bottom-6 right-6 z-[500] px-4 py-3">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {activeLayer} score
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Poor</span>
          <div
            className="h-2 w-32 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.585 0.20 27), oklch(0.78 0.15 85), oklch(0.62 0.14 152))",
            }}
          />
          <span className="text-[11px] text-muted-foreground">Good</span>
        </div>
      </GlassPanel>

      {/* Drill-in */}
      {selected && (
        <GlassPanel className="absolute right-6 top-6 z-[600] w-[320px] p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {selected.type === "station" ? "Busway station" : "Barangay"}
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

          {selected.type === "geounit" ? (
            <>
              <div className="mt-4 flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Population
                  </span>
                  <span className="nums text-[18px] font-semibold">
                    {selected.population?.toLocaleString() ?? "—"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Area
                  </span>
                  <span className="nums text-[18px] font-semibold">
                    {selected.area ?? "—"}{" "}
                    <span className="text-[12px] font-normal text-muted-foreground">
                      km²
                    </span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Crossings
                  </span>
                  <span className="nums text-[18px] font-semibold">
                    {selected.passageCount ?? "—"}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3.5">
                <ScoreBar
                  label="Accessibility"
                  score={selected.accessibilityScore ?? 0}
                />
                <ScoreBar label="Safety" score={selected.safetyScore ?? 0} />
                <ScoreBar
                  label="Mobility"
                  score={selected.mobilityScore ?? 0}
                />
              </div>
            </>
          ) : (
            <div className="mt-4 text-[13px] text-muted-foreground">
              EDSA busway station. Stations anchor the accessibility model:
              barangays within a short walk score higher on mobility.
            </div>
          )}
        </GlassPanel>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <span className="text-sm font-medium text-muted-foreground">
            Loading map…
          </span>
        </div>
      )}
    </AppShell>
  );
}
