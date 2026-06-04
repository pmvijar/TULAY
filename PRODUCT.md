# TULAY — Product context

## Register
product

## Product purpose
TULAY ("bridge" in Filipino) is a data-driven GIS decision tool for pedestrian mobility.
It scores city areas (Quezon City barangays, EDSA corridor) on accessibility, safety, and
mobility, then recommends where limited infrastructure budget should go first. It centralizes
data and analysis that today live scattered across agencies, so planners can defend a
priority order with evidence instead of intuition.

The core loop: look at a map of scored areas → drill into one area's statistics → read
AI-generated insights → ask follow-up questions / get policy recommendations grounded in
Philippine transport policy documents.

## Users
Urban planners, transport engineers, LGU/agency staff (MMDA, DOTr, city planning offices),
NGOs, and policy makers. Technical-literate but not data scientists. They work at a desk on
a wide monitor, in a bright office, comparing areas to make funding decisions. They care
about defensibility (why is this area prioritized?) more than dashboards for dashboards' sake.

## Scene
A city-planning officer at Quezon City Hall, mid-morning, bright office, 24-inch monitor,
comparing barangay pedestrian-priority scores to decide which corridors get sidewalk funding
this fiscal year. Calm, deliberate, reference-heavy work. This forces a LIGHT theme.

## Tone
Quietly authoritative. Civic, precise, trustworthy. Not playful, not "startup energy."
The interface should feel like a well-made instrument: legible, honest about uncertainty,
fast to scan. Numbers and geography are the heroes; chrome recedes.

## Brand direction
Soft-glass GIS. A calm tinted canvas with a slim icon rail and a contextual top bar
(persistent app shell). Content sits in softly-rounded panels; panels that float over the
map use intentional, restrained glass (backdrop blur + translucency) so the map stays
readable underneath. Everything else is solid and quiet. Maps are full-bleed and central.

## Strategic principles
- The map is the subject, not decoration. Give it room; let panels float, not box it in.
- Every number traceable. A score must always be explainable (what drove it).
- Honest about data state. Empty, loading, offline, and "no auth yet" are first-class states,
  never faked.
- Cheap and resilient. Live data when available, graceful mock fallback so the app always
  renders. The cheapest model/infra that is genuinely good enough.

## Anti-references (what to avoid)
- The stock zinc shadcn look with teal gradients bolted on (the current app).
- Control-room overload: not every pixel needs a chart. Density with breathing room.
- Generic "AI SaaS": gradient text, hero-metric template, identical icon-card grids,
  side-stripe accent borders, modal-as-first-thought.
- Civic-reflex palette: flat government blue, or eco-green just because it's "walkability."

## Auth note
There is no real authentication. The current login is a hardcoded check and the user menu
is decorative. Keep auth display-only / honest; do not fake a real auth system.
