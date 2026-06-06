"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
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
  Sparkles,
  Loader2,
  Hospital,
  GraduationCap,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

import { AppShell } from "@/components/shell/AppShell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "@/components/ui/score-bar";
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
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const FlyToSelected = dynamic(
  () => import("@/components/map/FlyToSelected"),
  { ssr: false }
);

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

// Toggleable landmark overlays. Station proximity already factors into the
// priority score; hospitals, schools, and crossings give planners the context
// behind it.
const POI_LAYERS = [
  { key: "stations", label: "Stations", icon: TrainFront, color: "oklch(0.5 0.18 280)" },
  { key: "crossings", label: "Crossings", icon: Footprints, color: "oklch(0.62 0.14 152)" },
  { key: "hospitals", label: "Hospitals", icon: Hospital, color: "oklch(0.585 0.20 27)" },
  { key: "schools", label: "Schools", icon: GraduationCap, color: "oklch(0.66 0.16 50)" },
];

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
  const [pois, setPois] = useState([]);
  const [show, setShow] = useState({
    stations: true,
    crossings: false,
    hospitals: false,
    schools: false,
  });
  const [selected, setSelected] = useState(null);
  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));
  const [query, setQuery] = useState("");
  const [rec, setRec] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  // Esc closes the drill-in.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function getRecommendations(unit) {
    setRecLoading(true);
    setRec(null);
    const { data } = await apiPost("/recommend", {
      name: unit.name,
      accessibilityScore: unit.accessibilityScore,
      safetyScore: unit.safetyScore,
      mobilityScore: unit.mobilityScore,
      population: unit.population,
    });
    setRec(data);
    setRecLoading(false);
  }

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
      const [g, s, p, poi] = await Promise.all([
        apiPost("/gis/geounits", { location: "NCR" }),
        apiPost("/gis/stations", { location: "NCR" }),
        apiPost("/gis/passages", { location: "NCR" }),
        apiPost("/gis/pois", { location: "NCR" }),
      ]);
      setGeoUnits(Array.isArray(g.data) ? g.data : []);
      setStations(Array.isArray(s.data) ? s.data : []);
      setPassages(Array.isArray(p.data) ? p.data : []);
      setPois(Array.isArray(poi.data) ? poi.data : []);
      setSource(g.source);
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    setRec(null);
    setRecLoading(false);
  }, [selected?._id]);

  const scoreOf = (unit) =>
    unit?.[SCORE_KEY[activeLayer]] ?? unit?.proximityScore ?? 0;

  // One FeatureCollection rendered as a single layer (scales to ~800+ barangays).
  const featureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: geoUnits.map((u) => ({
        type: "Feature",
        properties: { ...u, type: "geounit" },
        geometry: u.location,
      })),
    }),
    [geoUnits]
  );

  const styleFn = (feature) => {
    const score = feature.properties[SCORE_KEY[activeLayer]] ?? 0;
    return {
      color: "oklch(0.62 0.012 264 / 0.45)",
      weight: 0.5,
      fillColor: qualityColor(score),
      fillOpacity: 0.32,
    };
  };

  const onEachFeature = (feature, layer) => {
    layer.bindTooltip(feature.properties.name, { sticky: true });
    layer.on("click", () => setSelected({ ...feature.properties, type: "geounit" }));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...geoUnits].sort(
      (a, b) => scoreOf(b) - scoreOf(a)
    );
    if (!q) return list;
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q)
    );
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
            center={[14.58, 121.0]}
            zoom={11}
            zoomControl={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            <GeoJSON
              key={activeLayer}
              data={featureCollection}
              style={styleFn}
              onEachFeature={onEachFeature}
            />
            {selected?.location && (
              <FlyToSelected geometry={selected.location} id={selected._id} />
            )}
            {selected?.location && (
              <GeoJSON
                key={"sel-" + selected._id + activeLayer}
                data={selected.location}
                style={{
                  color: "oklch(0.5 0.18 258)",
                  weight: 3,
                  fillColor: qualityColor(
                    selected[SCORE_KEY[activeLayer]] ?? selected.proximityScore ?? 0
                  ),
                  fillOpacity: 0.45,
                }}
                interactive={false}
              />
            )}

            {show.stations &&
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

            {show.crossings &&
              passages.map((p) => (
                <CircleMarker
                  key={p._id}
                  center={[p.location.coordinates[1], p.location.coordinates[0]]}
                  radius={3}
                  pathOptions={{
                    color: "oklch(0.62 0.14 152)",
                    fillColor: "oklch(0.62 0.14 152)",
                    fillOpacity: 0.85,
                    weight: 0,
                  }}
                >
                  <Tooltip className="capitalize">{p.type}</Tooltip>
                </CircleMarker>
              ))}

            {show.hospitals &&
              pois
                .filter((p) => p.kind === "hospital")
                .map((p) => (
                  <CircleMarker
                    key={p._id}
                    center={[p.location.coordinates[1], p.location.coordinates[0]]}
                    radius={4}
                    pathOptions={{
                      color: "oklch(0.99 0.01 258)",
                      fillColor: "oklch(0.585 0.20 27)",
                      fillOpacity: 0.95,
                      weight: 1.2,
                    }}
                  >
                    <Tooltip>{p.name}</Tooltip>
                  </CircleMarker>
                ))}

            {show.schools &&
              pois
                .filter((p) => p.kind === "school")
                .map((p) => (
                  <CircleMarker
                    key={p._id}
                    center={[p.location.coordinates[1], p.location.coordinates[0]]}
                    radius={3}
                    pathOptions={{
                      color: "oklch(0.66 0.16 50)",
                      fillColor: "oklch(0.66 0.16 50)",
                      fillOpacity: 0.85,
                      weight: 0,
                    }}
                  >
                    <Tooltip>{p.name}</Tooltip>
                  </CircleMarker>
                ))}
          </MapContainer>
        )}
      </div>

      {/* Header / breadcrumb */}
      <GlassPanel className="absolute left-6 top-6 z-[500] w-[340px] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Metro Manila
            <span className="text-border-strong">/</span>
            {geoUnits.length} barangays
          </div>
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
                onClick={() => setSelected({ ...u, type: "geounit" })}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
                  isSel ? "bg-accent-soft" : "hover:bg-surface-muted"
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-medium">
                    {u.name}
                  </span>
                  {u.city && (
                    <span className="truncate text-[11px] text-muted-foreground">
                      {u.city}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
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

      {/* Layer + landmark controls */}
      <GlassPanel className="absolute bottom-6 left-6 z-[500] flex flex-col gap-2 p-3">
        <div className="flex items-center gap-1">
          <span className="w-[52px] shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Layers className="mr-1 inline h-3.5 w-3.5" />
            Shade
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
        <div className="flex items-center gap-1 border-t border-border/60 pt-2">
          <span className="w-[52px] shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Show
          </span>
          {POI_LAYERS.map((p) => {
            const Icon = p.icon;
            const on = show[p.key];
            return (
              <button
                key={p.key}
                onClick={() => toggle(p.key)}
                aria-pressed={on}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200 ease-out-quint",
                  on
                    ? "border-transparent bg-surface-muted text-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: on ? p.color : "currentColor" }}
                />
                {p.label}
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
                {selected.type === "station"
                  ? selected.line || "Station"
                  : selected.city
                  ? `Barangay · ${selected.city}`
                  : "Barangay"}
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

              <div className="mt-5 border-t border-border pt-4">
                {!rec && !recLoading && (
                  <Button
                    variant="quiet"
                    size="sm"
                    className="w-full"
                    onClick={() => getRecommendations(selected)}
                  >
                    <Sparkles className="h-4 w-4 text-accent" />
                    Recommend actions
                  </Button>
                )}
                {recLoading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-[13px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating recommendations…
                  </div>
                )}
                {rec && (
                  <div className="animate-fade-up">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      Recommended actions
                      {rec.offline && (
                        <span className="ml-auto rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] normal-case tracking-normal">
                          offline
                        </span>
                      )}
                    </div>
                    {rec.summary && (
                      <p className="mb-3 text-[13px] leading-relaxed text-foreground">
                        {rec.summary}
                      </p>
                    )}
                    <ol className="flex flex-col gap-2.5">
                      {(rec.actions || []).map((a) => (
                        <li key={a.priority} className="flex gap-2.5">
                          <span className="nums mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                            {a.priority}
                          </span>
                          <div>
                            <div className="text-[13px] font-medium leading-snug">
                              {a.title}
                            </div>
                            {a.detail && (
                              <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                                {a.detail}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
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
