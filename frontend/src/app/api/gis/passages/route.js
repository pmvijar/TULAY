import { NextResponse } from "next/server";
import { getDb, hasDb } from "@/lib/db";
import { mockPassages } from "@/lib/mock";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST() {
  try {
    if (hasDb()) {
      const db = await getDb();
      const docs = await db
        .collection("passages")
        .find({}, { projection: { _id: 0 } })
        .toArray();
      if (docs.length) return NextResponse.json(docs);
    }
  } catch (err) {
    console.error("passages db error:", err.message);
  }
  return NextResponse.json(mockPassages());
}
