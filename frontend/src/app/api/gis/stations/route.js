import { NextResponse } from "next/server";
import { getDb, hasDb } from "@/lib/db";
import fallbackData from "@/data/ncr-stations.json";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST() {
  try {
    if (hasDb()) {
      const db = await getDb();
      const docs = await db
        .collection("stations")
        .find({})
        .toArray();
      if (docs.length) return NextResponse.json(docs);
    }
  } catch (err) {
    console.error("stations db error:", err.message);
  }
  return NextResponse.json(fallbackData);
}
