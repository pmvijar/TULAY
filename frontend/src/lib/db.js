// Lazy, cached MongoDB connection. Serverless functions must not open a new
// connection per invocation, so we memoize the promise on globalThis and
// connect on first use only. If MONGODB_URI is unset, callers fall back to
// derived data, so the app deploys and runs before Atlas is provisioned.
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tulay";

let cached = globalThis.__tulayMongo;
if (!cached) cached = globalThis.__tulayMongo = { client: null, promise: null };

export function hasDb() {
  return Boolean(uri);
}

export async function getDb() {
  if (!uri) return null;
  if (cached.client) return cached.client.db(dbName);
  if (!cached.promise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 6000,
    });
    cached.promise = client.connect().then((c) => {
      cached.client = c;
      return c;
    });
  }
  await cached.promise;
  return cached.client.db(dbName);
}
