import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";

// TEMPORARY diagnostic route used to audit the live database from inside the
// app (where MONGODB_URI is injected). Deleted once the audit is complete.
export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {};
  const t0 = Date.now();

  try {
    await dbConnect();
    out.connectMs = Date.now() - t0;

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "no db handle" }, { status: 500 });
    }

    out.dbName = db.databaseName;

    const cols = await db.listCollections().toArray();
    const collections: Record<string, unknown> = {};

    for (const c of cols.sort((a, b) => a.name.localeCompare(b.name))) {
      const t = Date.now();
      const count = await db.collection(c.name).countDocuments();
      const indexes = await db.collection(c.name).indexes();
      collections[c.name] = {
        docs: count,
        countMs: Date.now() - t,
        indexes: indexes.map((i) => i.name),
      };
    }
    out.collections = collections;
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }

  out.totalMs = Date.now() - t0;
  return NextResponse.json(out);
}
