# TULAY

Towards better pedestrian mobility.

TULAY ("bridge" in Filipino) is a data-driven GIS tool that scores city areas on
accessibility, safety, and mobility, then recommends where limited pedestrian
infrastructure budget should go first. It is built for urban planners, transport
engineers, and LGU staff who need to defend a priority order with evidence.

**Live:** https://tulay-sooty.vercel.app

## What's here

This repository began as the LakbAI bus-analytics codebase and contains two
products. The **TULAY** app is the pedestrian-mobility GIS:

- **Accessibility map** (`/pam`) — Quezon City barangays shaded by an accessibility,
  safety, or mobility layer, over EDSA busway stations and pedestrian crossings.
  Select an area for its three sub-scores, population, and crossings, then generate
  AI recommended actions grounded in the weakest scores.
- **Transit coverage** (`/gis-map`) — station walking-catchment rings (near / medium /
  far) over the same barangays shaded by pedestrian-access priority, with a drill-in
  showing each area's priority score.

The root (`/`) redirects to the accessibility map. The legacy LakbAI bus-analytics
pages (`/dashboard`, `/recommendations`) remain in the codebase, untouched, and are
not part of the TULAY app.

## Stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Leaflet / react-leaflet,
  Recharts. OKLCH design-token system, a persistent glass-GIS app shell, and a small set
  of shared primitives (panel, badge, score badge, score bar, stat tile, glass panel).
- **Backend:** Next.js Route Handlers (`/api/*`) — no separate server.
  - `POST /api/gis/{geounits,stations,passages}` read from MongoDB Atlas (lazy, cached
    connection for serverless), falling back to derived data when the DB is unset.
  - `POST /api/recommend` calls OpenRouter (cheapest configurable model) for prioritized
    infrastructure actions, with a deterministic offline fallback.
- **Data:** MongoDB Atlas, seeded from the real QC barangay GeoJSON and EDSA station
  coordinates. The frontend fetches live data through a single `apiPost` client that
  falls back to identical derived mock data, so the app renders offline and shows a
  live / mock status badge.
- **Deploy:** Vercel.

## Local development

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000  (redirects to /pam)
```

The app runs with no configuration: with no `MONGODB_URI` or `OPENROUTER_API_KEY`,
the API routes and client both serve the derived fallback data and the UI shows a
"Mock data" badge.

### Environment

Create `frontend/.env.local` (gitignored) for the live data path:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/tulay?retryWrites=true&w=majority
MONGODB_DB=tulay
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct   # optional; cheap default
```

### Seed the database

```bash
cd frontend
MONGODB_URI="mongodb+srv://..." node scripts/seed.mjs
```

The seed is idempotent (upserts keyed by `_id`) and uses the same derivation the
offline fallback uses, so live and fallback data are identical.

## Notes and limitations

- **No real authentication.** The legacy login is a hardcoded demo check; the TULAY
  app does not gate access. Nothing in the UI fakes an auth system.
- **Scores are modeled, not surveyed.** Barangay sub-scores are derived
  deterministically from station proximity and stable per-area variation to
  demonstrate the workflow; they are not official survey data.
- **The recommend endpoint is public** on the demo and calls a paid model. Inputs are
  small and token output is capped; rotate the key if you fork this.
