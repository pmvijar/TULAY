import Link from "next/link";
import {
  Footprints,
  ArrowRight,
  Map as MapIcon,
  Layers,
  Sparkles,
  TrainFront,
  Hospital,
  Building2,
  Github,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Barangays scored", value: "814", icon: Layers },
  { label: "NCR cities", value: "17", icon: Building2 },
  { label: "Transit stations", value: "66", icon: TrainFront },
  { label: "Hospitals mapped", value: "252", icon: Hospital },
];

const STEPS = [
  {
    n: "01",
    icon: MapIcon,
    title: "Score every barangay",
    body: "All 814 barangays are rated on accessibility, safety, and mobility, then blended into one priority order across the whole metro.",
  },
  {
    n: "02",
    icon: Layers,
    title: "Drill into an area",
    body: "Select a barangay to see what drives its score: nearby stations, hospitals, schools, crossings, and population pressure.",
  },
  {
    n: "03",
    icon: Sparkles,
    title: "Get AI recommended actions",
    body: "Read a grounded summary and a ranked list of interventions you can lift straight into a funding memo.",
  },
];

// Mock rows for the floating glass map panel. Illustrative, not live data.
const MOCK_ROWS = [
  { name: "Bagong Silangan", city: "Quezon City", score: 91, p: "var(--p5)" },
  { name: "Pinagbuhatan", city: "Pasig", score: 84, p: "var(--p4)" },
  { name: "Tondo", city: "Manila", score: 78, p: "var(--p3)" },
  { name: "Western Bicutan", city: "Taguig", score: 62, p: "var(--p2)" },
  { name: "Addition Hills", city: "Mandaluyong", score: 48, p: "var(--p1)" },
];

export default function LandingPage() {
  return (
    <main className="canvas-grad min-h-screen text-foreground">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-fg shadow-sm">
            <Footprints className="h-5 w-5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">TULAY</span>
        </Link>

        <Button asChild variant="ghost" size="sm">
          <Link href="/pam">
            Open the app
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-12 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Pedestrian mobility GIS for Metro Manila
          </span>

          <h1 className="mt-5 text-balance text-[33px] font-bold leading-[1.08] tracking-tight sm:text-[44px] sm:leading-[1.05]">
            Where Metro Manila needs to walk better.
          </h1>

          <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-muted-foreground">
            TULAY scores every barangay on accessibility, safety, and mobility,
            then recommends where limited pedestrian infrastructure budget should
            go first. It centralizes data that today lives scattered across
            agencies, so planners can defend a priority order with evidence
            instead of intuition.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/pam">
                Open the map
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="quiet" size="lg">
              <Link href="/overview">View analytics</Link>
            </Button>
          </div>
        </div>

        {/* Floating glass mock of the product UI: the one intentional glass element */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-6 rounded-[28px] bg-accent/5 blur-2xl"
          />
          <div className="glass relative rounded-[20px] p-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                <MapIcon className="h-3.5 w-3.5" />
                Priority ranking
              </div>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                accessibility
              </span>
            </div>

            <ul className="flex flex-col gap-1.5">
              {MOCK_ROWS.map((r) => (
                <li
                  key={r.name}
                  className="flex items-center justify-between gap-3 rounded-md bg-surface/70 px-3 py-2.5"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] font-medium">
                      {r.name}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {r.city}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${r.score}%`, background: r.p }}
                      />
                    </span>
                    <span
                      className="nums w-6 text-right text-[13px] font-semibold"
                      style={{ color: r.p }}
                    >
                      {r.score}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-3 px-1 text-[11px] text-muted-foreground">
              Illustrative ranking. Higher score means higher need for
              intervention.
            </p>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex flex-col gap-2 bg-surface px-5 py-6"
              >
                <Icon className="h-4 w-4 text-accent" />
                <span className="nums text-[28px] font-bold leading-none">
                  {s.value}
                </span>
                <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:py-24">
        <div className="max-w-[55ch]">
          <h2 className="text-[26px] font-semibold tracking-tight">
            How it works
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Three steps from a metro-wide map to a defensible funding decision.
          </p>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.n}
                className={
                  i < STEPS.length - 1
                    ? "md:border-r md:border-border md:pr-6"
                    : ""
                }
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="nums text-[13px] font-semibold text-muted-foreground">
                    {step.n}
                  </span>
                </div>
                <h3 className="mt-4 text-[17px] font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-5">
          <p className="flex-1 text-[14px] text-muted-foreground">
            Start with the map, or jump to the metro-wide analytics.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/pam">
                Open the map
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="quiet">
              <Link href="/overview">View analytics</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[60ch]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-fg">
                <Footprints className="h-4 w-4" />
              </span>
              <span className="text-[14px] font-semibold tracking-tight">
                TULAY
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Boundaries and points of interest from OpenStreetMap and the
              philippines-json-maps barangay dataset. Scores shown here are
              modeled for demonstration and are not an official priority order.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-[13px]">
            <Link
              href="https://github.com/pmvijar/TULAY"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Github className="h-4 w-4" />
              github.com/pmvijar/TULAY
            </Link>
            <Link
              href="/pam"
              className="inline-flex items-center gap-2 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Open the app
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
