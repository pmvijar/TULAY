import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";

// Deterministic fallback so the feature degrades gracefully with no key / on
// error. Targets the weakest sub-score with a concrete action.
function fallbackActions(b) {
  const scores = [
    { k: "accessibility", v: b.accessibilityScore ?? 1 },
    { k: "safety", v: b.safetyScore ?? 1 },
    { k: "mobility", v: b.mobilityScore ?? 1 },
  ].sort((a, c) => a.v - c.v);
  const lib = {
    accessibility: {
      title: "Add ramped, shaded footways to the nearest station",
      detail:
        "Close the last-mile gap with continuous, accessible sidewalks and curb ramps so residents can reach transit on foot comfortably.",
    },
    safety: {
      title: "Install signalized crossings at high-conflict intersections",
      detail:
        "Prioritize pedestrian-protected phases and refuge islands where foot traffic meets fast through-traffic.",
    },
    mobility: {
      title: "Introduce a feeder or shared-mobility link",
      detail:
        "Connect the barangay interior to the corridor with a short feeder route or e-trike bay to cut walking distance.",
    },
  };
  return {
    summary: `${b.name} scores lowest on ${scores[0].k}. Sequence interventions from that gap outward.`,
    actions: scores.map((s, i) => ({ priority: i + 1, ...lib[s.k] })),
    offline: true,
  };
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {}

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json(fallbackActions(body));

  const prompt = `You are an urban-mobility planner advising a Philippine LGU. For the barangay below in Quezon City, recommend exactly three prioritized pedestrian-infrastructure actions. Ground them in the weakest scores. Be concrete and local (sidewalks, crossings, footbridges, feeder transit, lighting). Return STRICT JSON only:
{"summary":"one sentence","actions":[{"priority":1,"title":"short action","detail":"one sentence why and how"}]}

Barangay: ${body.name || "unknown"}
Scores (0-100): accessibility ${Math.round((body.accessibilityScore ?? 0) * 100)}, safety ${Math.round((body.safetyScore ?? 0) * 100)}, mobility ${Math.round((body.mobilityScore ?? 0) * 100)}
Population: ${body.population ?? "n/a"}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tulay.vercel.app",
        "X-Title": "TULAY",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty completion");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.actions)) throw new Error("bad shape");
    return NextResponse.json({ ...parsed, model: MODEL });
  } catch (err) {
    console.error("recommend error:", err.message);
    return NextResponse.json(fallbackActions(body));
  }
}
