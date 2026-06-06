import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";

function fallback(s) {
  return {
    summary: `Across ${s.totalBarangays || 0} barangays in ${s.cities || 0} Metro Manila cities, pedestrian-access priority concentrates on areas far from rail and busway stations.`,
    insights: [
      {
        title: "Priority follows the transit gap",
        detail:
          "The highest-priority barangays cluster where walking distance to the nearest station is longest. Closing that last-mile gap is the clearest lever.",
      },
      {
        title: "Coverage is uneven across cities",
        detail:
          "Average priority varies widely between LGUs, so a metro-wide budget should be weighted toward the cities with the worst average access, not split evenly.",
      },
      {
        title: "Safe crossings lag behind proximity",
        detail:
          "Several areas sit near a station yet still score poorly, pointing to missing footbridges and signalized crossings rather than raw distance.",
      },
    ],
    actions: [
      { priority: 1, title: "Fund last-mile footways in the top-priority fringe barangays", detail: "Target continuous, accessible sidewalks where station distance is greatest." },
      { priority: 2, title: "Add protected crossings near high-traffic stations", detail: "Prioritize footbridges and signalized crossings where foot traffic meets fast roads." },
      { priority: 3, title: "Weight the budget by city-level access gaps", detail: "Allocate proportionally to each city's average priority rather than evenly." },
    ],
    offline: true,
  };
}

export async function POST(req) {
  let s = {};
  try {
    s = await req.json();
  } catch {}

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json(fallback(s));

  const prompt = `You are an urban-mobility analyst briefing a Metro Manila planning body. Using the aggregate pedestrian-mobility statistics below, return STRICT JSON only:
{"summary":"one or two sentences","insights":[{"title":"short","detail":"one sentence"}],"actions":[{"priority":1,"title":"short action","detail":"one sentence"}]}
Give exactly 3 insights and 3 actions. Be concrete and grounded in the numbers.

Stats: ${JSON.stringify(s).slice(0, 2000)}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tulay-sooty.vercel.app",
        "X-Title": "TULAY",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.insights) || !Array.isArray(parsed.actions))
      throw new Error("bad shape");
    return NextResponse.json({ ...parsed, model: MODEL });
  } catch (err) {
    console.error("overview-insights error:", err.message);
    return NextResponse.json(fallback(s));
  }
}
