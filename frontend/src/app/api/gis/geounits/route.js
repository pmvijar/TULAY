import { NextResponse } from "next/server";
import { getDb, hasDb } from "@/lib/db";
import { mockGeoUnits } from "@/lib/mock";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST() {
  try {
    if (hasDb()) {
      const db = await getDb();
      const docs = await db
        .collection("geounits")
        .find({}, { projection: { _id: 0 } })
        .toArray();
      if (docs.length) return NextResponse.json(docs);
    }
  } catch (err) {
    console.error("geounits db error:", err.message);
  }
  // Derived fallback (same source the DB is seeded from).
  return NextResponse.json(mockGeoUnits());
}
