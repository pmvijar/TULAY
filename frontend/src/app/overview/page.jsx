"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  TriangleAlert,
  Building2,
  TrainFront,
  Users,
  Footprints,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "leaflet/dist/leaflet.css";

import { AppShell } from "@/components/shell/AppShell";
import { TopBar } from "@/components/shell/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { ScoreBar } from "@/components/ui/score-bar";
import { ScoreBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";
import { scoreColor, qualityColor } from "@/lib/scoring";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const HeatLayer = dynamic(() => import("@/components/map/HeatLayer"), {
  ssr: false,
});

const AXIS = "oklch(0.515 0.014 264)";
const GRID = "oklch(0.915 0.007 258)";

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-panel">
      <div className="mb-0.5 text-[12px] font-medium text-muted-foreground">
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="nums text-[13px] font-semibold">
          {p.value}
          <span className="ml-1 font-normal text-muted-foreground">
            {p.name}
          </span>
        </div>
      ))}
    </div>
  );
}

const pct = (n) => Math.round(n * 100);

export default function OverviewPage() {
  const [geoUnits, setGeoUnits] = useState([]);
  const [stations, setStations] = useState([]);
  const [pois, setPois] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [g, s, p] = await Promise.all([
        apiPost("/gis/geounits", { location: "NCR" }),
        apiPost("/gis/stations", { location: "NCR" }),
        apiPost("/gis/pois", { location: "NCR" }),
      ]);
      setGeoUnits(Array.isArray(g.data) ? g.data : []);
      setStations(Array.isArray(s.data) ? s.data : []);
      setPois(Array.isArray(p.data) ? p.data : []);
      setIsLoading(false);
    })();
  }, []);

  const m = useMemo(() => {
    if (!geoUnits.length) return null;
    const n = geoUnits.length;
    const mean = (f) => geoUnits.reduce((a, u) => a + (f(u) || 0), 0) / n;
    const avgPriority = mean((u) => u.proximityScore);
    const critical = geoUnits.filter((u) => u.proximityScore >= 0.8).length;
    const high = geoUnits.filter(
      (u) => u.proximityScore >= 0.6 && u.proximityScore < 0.8
    ).length;
    const adequate = geoUnits.filter((u) => u.proximityScore < 0.4).length;
    const population = geoUnits.reduce((a, u) => a + (u.population || 0), 0);

    const bands = [
      { band: "0-20", lo: 0, hi: 0.2 },
      { band: "20-40", lo: 0.2, hi: 0.4 },
      { band: "40-60", lo: 0.4, hi: 0.6 },
      { band: "60-80", lo: 0.6, hi: 0.8 },
      { band: "80-100", lo: 0.8, hi: 1.01 },
    ].map((b) => ({
      band: b.band,
      count: geoUnits.filter(
        (u) => u.proximityScore >= b.lo && u.proximityScore < b.hi
      ).length,
      color: scoreColor((b.lo + b.hi) / 2),
    }));

    const cityMap = {};
    geoUnits.forEach((u) => {
      const c = u.city || "Other";
      cityMap[c] = cityMap[c] || { city: c, sum: 0, n: 0, acc: 0, saf: 0, mob: 0 };
      cityMap[c].sum += u.proximityScore;
      cityMap[c].acc += u.accessibilityScore || 0;
      cityMap[c].saf += u.safetyScore || 0;
      cityMap[c].mob += u.mobilityScore || 0;
      cityMap[c].n += 1;
    });
    const byCity = Object.values(cityMap)
      .map((c) => ({
        city: c.city,
        priority: c.sum / c.n,
        accessibility: c.acc / c.n,
        safety: c.saf / c.n,
        mobility: c.mob / c.n,
        count: c.n,
      }))
      .sort((a, b) => b.priority - a.priority);

    const top = [...geoUnits]
      .sort((a, b) => b.proximityScore - a.proximityScore)
      .slice(0, 10);

    const heat = geoUnits
      .filter((u) => u.centroid)
      .map((u) => [u.centroid[0], u.centroid[1], u.proximityScore]);

    return {
      n,
      cities: byCity.length,
      avgPriority,
      critical,
      high,
      adequate,
      population,
      avgAccess: mean((u) => u.accessibilityScore),
      avgSafety: mean((u) => u.safetyScore),
      avgMobility: mean((u) => u.mobilityScore),
      bands,
      byCity,
      top,
      heat,
    };
  }, [geoUnits]);

  const hospitals = pois.filter((p) => p.kind === "hospital").length;
  const schools = pois.filter((p) => p.kind === "school").length;

  async function generate() {
    if (!m) return;
    setAiLoading(true);
    setAi(null);
    const { data } = await apiPost("/overview-insights", {
      totalBarangays: m.n,
      cities: m.cities,
      avgPriority: pct(m.avgPriority),
      critical: m.critical,
      adequate: m.adequate,
      population: m.population,
      stations: stations.length,
      hospitals,
      schools,
      worstCities: m.byCity.slice(0, 5).map((c) => ({
        city: c.city,
        avgPriority: pct(c.priority),
      })),
      topAreas: m.top.slice(0, 6).map((u) => ({
        name: u.name,
        city: u.city,
        priority: pct(u.proximityScore),
      })),
    });
    setAi(data);
    setAiLoading(false);
  }

  return (
    <AppShell scroll>
      <TopBar
        title="Metro Manila overview"
        subtitle="Pedestrian-mobility analytics across all 17 cities"
      >
        <Button asChild variant="quiet" size="sm">
          <Link href="/pam">
            Open map <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </TopBar>

      <div className="canvas-grad min-h-full p-6">
        {isLoading || !m ? (
          <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading analytics…
          </div>
        ) : (
          <>
            {/* Stat strip */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Card className="p-5">
                <StatTile label="Barangays" value={m.n.toLocaleString()} hint={`${m.cities} cities`} />
              </Card>
              <Card className="p-5">
                <StatTile
                  label="Avg priority"
                  value={pct(m.avgPriority)}
                  hint="0 = adequate, 100 = critical"
                />
              </Card>
              <Card className="p-5">
                <StatTile
                  label="Critical areas"
                  value={m.critical}
                  hint="score 80+"
                />
              </Card>
              <Card className="p-5">
                <StatTile
                  label="People covered"
                  value={`${(m.population / 1e6).toFixed(1)}M`}
                  hint="modeled"
                />
              </Card>
              <Card className="p-5">
                <StatTile label="Transit stations" value={stations.length} />
              </Card>
              <Card className="p-5">
                <StatTile label="Hospitals · schools" value={`${hospitals} · ${schools}`} />
              </Card>
            </div>

            {/* AI overall insights */}
            <Card className="mb-6">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Overall insights and recommendations
                </CardTitle>
                {!ai && !aiLoading && (
                  <Button size="sm" onClick={generate}>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!ai && !aiLoading && (
                  <p className="text-[13px] text-muted-foreground">
                    Summarize the metro-wide picture and propose prioritized
                    actions from the current data.
                  </p>
                )}
                {aiLoading && (
                  <div className="flex items-center gap-2 py-3 text-[13px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing {m.n} barangays…
                  </div>
                )}
                {ai && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="mb-3 text-[14px] leading-relaxed">
                        {ai.summary}
                      </p>
                      <div className="flex flex-col gap-3">
                        {(ai.insights || []).map((it, i) => (
                          <div key={i}>
                            <div className="text-[13px] font-semibold">
                              {it.title}
                            </div>
                            <div className="text-[13px] text-muted-foreground">
                              {it.detail}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-surface-muted/50 p-4">
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Recommended actions
                        {ai.offline && (
                          <span className="ml-2 rounded-full bg-surface px-1.5 py-0.5 text-[10px] normal-case">
                            offline
                          </span>
                        )}
                      </div>
                      <ol className="flex flex-col gap-2.5">
                        {(ai.actions || []).map((a) => (
                          <li key={a.priority} className="flex gap-2.5">
                            <span className="nums mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                              {a.priority}
                            </span>
                            <div>
                              <div className="text-[13px] font-medium leading-snug">
                                {a.title}
                              </div>
                              <div className="text-[12px] leading-snug text-muted-foreground">
                                {a.detail}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* Heatmap */}
              <Card className="overflow-hidden xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TriangleAlert className="h-4 w-4 text-accent" />
                    Priority heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <MapContainer
                    center={[14.58, 121.0]}
                    zoom={11}
                    style={{ height: 420, width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution="&copy; OpenStreetMap &copy; CARTO"
                    />
                    <HeatLayer points={m.heat} />
                  </MapContainer>
                </CardContent>
              </Card>

              {/* Sub-score averages + distribution */}
              <div className="flex flex-col gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Metro averages</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3.5">
                    <ScoreBar label="Accessibility" score={m.avgAccess} />
                    <ScoreBar label="Safety" score={m.avgSafety} />
                    <ScoreBar label="Mobility" score={m.avgMobility} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Priority distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={170}>
                      <BarChart data={m.bands} margin={{ left: -16, right: 6 }}>
                        <CartesianGrid stroke={GRID} vertical={false} />
                        <XAxis dataKey="band" stroke={AXIS} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} />
                        <YAxis stroke={AXIS} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTip />} cursor={{ fill: "oklch(0.555 0.175 258 / 0.06)" }} />
                        <Bar dataKey="count" name="barangays" radius={[3, 3, 0, 0]}>
                          {m.bands.map((b, i) => (
                            <Cell key={i} fill={b.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Per-city priority */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-accent" />
                    Average priority by city
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart
                      data={m.byCity}
                      layout="vertical"
                      margin={{ left: 30, right: 12 }}
                    >
                      <CartesianGrid stroke={GRID} horizontal={false} />
                      <XAxis type="number" domain={[0, 1]} stroke={AXIS} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={pct} />
                      <YAxis type="category" dataKey="city" width={84} stroke={AXIS} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: "oklch(0.555 0.175 258 / 0.06)" }} />
                      <Bar dataKey="priority" name="avg priority" radius={[0, 3, 3, 0]}>
                        {m.byCity.map((c, i) => (
                          <Cell key={i} fill={scoreColor(c.priority)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top priority list */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Footprints className="h-4 w-4 text-accent" />
                    Highest-priority barangays
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {m.top.map((u, i) => (
                      <Link
                        key={u._id}
                        href="/pam"
                        className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted"
                      >
                        <span className="nums w-5 text-[12px] font-semibold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-medium">
                            {u.name}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {u.city} · {u.nearestStationKm ?? "—"} km to station
                          </span>
                        </span>
                        <ScoreBadge score={u.proximityScore} />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* City x metric matrix heatmap */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>City scorecard</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-separate border-spacing-1 text-[13px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-1 text-left font-medium">City</th>
                      <th className="px-2 py-1 text-right font-medium">Barangays</th>
                      <th className="px-2 py-1 text-center font-medium">Accessibility</th>
                      <th className="px-2 py-1 text-center font-medium">Safety</th>
                      <th className="px-2 py-1 text-center font-medium">Mobility</th>
                      <th className="px-2 py-1 text-center font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.byCity.map((c) => {
                      const cell = (val, color) => (
                        <td className="px-1 py-0.5 text-center">
                          <span
                            className="nums inline-block w-full rounded-[6px] py-1 font-semibold"
                            style={{
                              background: `color-mix(in oklch, ${color} 22%, transparent)`,
                              color,
                            }}
                          >
                            {pct(val)}
                          </span>
                        </td>
                      );
                      return (
                        <tr key={c.city}>
                          <td className="px-2 py-0.5 font-medium">{c.city}</td>
                          <td className="nums px-2 py-0.5 text-right text-muted-foreground">
                            {c.count}
                          </td>
                          {cell(c.accessibility, qualityColor(c.accessibility))}
                          {cell(c.safety, qualityColor(c.safety))}
                          {cell(c.mobility, qualityColor(c.mobility))}
                          {cell(c.priority, scoreColor(c.priority))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Data sources */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Data sources</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: "Barangay boundaries",
                    detail: "2023 administrative boundaries for all 17 NCR cities.",
                    source: "philippines-json-maps",
                    href: "https://github.com/faeldon/philippines-json-maps",
                  },
                  {
                    label: "Transit stations",
                    detail: "LRT, MRT, PNR and EDSA busway stations.",
                    source: "OpenStreetMap (Overpass)",
                    href: "https://www.openstreetmap.org/copyright",
                  },
                  {
                    label: "Hospitals and schools",
                    detail: "Landmark points used as access context.",
                    source: "OpenStreetMap (Overpass)",
                    href: "https://www.openstreetmap.org/copyright",
                  },
                  {
                    label: "Basemap",
                    detail: "Light tiles for the maps.",
                    source: "CARTO · OpenStreetMap",
                    href: "https://carto.com/attribution/",
                  },
                  {
                    label: "Recommendations",
                    detail: "AI insights and actions, grounded in the scores.",
                    source: "OpenRouter",
                    href: "https://openrouter.ai",
                  },
                  {
                    label: "Priority score",
                    detail:
                      "Modeled on transit proximity for demonstration, not survey data.",
                    source: "TULAY model",
                    href: null,
                  },
                ].map((d) => (
                  <div key={d.label} className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold">{d.label}</span>
                    <span className="text-[12px] text-muted-foreground">
                      {d.detail}
                    </span>
                    {d.href ? (
                      <a
                        href={d.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex w-fit items-center gap-1 text-[12px] font-medium text-accent hover:underline"
                      >
                        {d.source}
                        <ArrowRight className="h-3 w-3 -rotate-45" />
                      </a>
                    ) : (
                      <span className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                        {d.source}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
