// Idempotent seed for the TULAY GIS collections. Re-running yields the same
// state (replaceOne upserts keyed by _id). Reads the same derivation the app's
// offline fallback uses, so live and fallback data are identical.
//
// Usage: MONGODB_URI="mongodb+srv://..." node scripts/seed.mjs
import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  deriveGeoUnits,
  deriveStations,
  derivePassages,
} from "../src/lib/derive.mjs";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tulay";
if (!uri) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const geo = JSON.parse(
  readFileSync(join(here, "../src/geojson/qc_barangays.geojson"), "utf8")
);

const collections = {
  geounits: deriveGeoUnits(geo.features),
  stations: deriveStations(),
  passages: derivePassages(),
};

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(dbName);
  for (const [name, docs] of Object.entries(collections)) {
    const col = db.collection(name);
    await Promise.all(
      docs.map((d) => col.replaceOne({ _id: d._id }, d, { upsert: true }))
    );
    const count = await col.countDocuments();
    console.log(`seeded ${name}: ${docs.length} derived, ${count} in db`);
  }
  console.log("seed complete");
} catch (err) {
  console.error("seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
