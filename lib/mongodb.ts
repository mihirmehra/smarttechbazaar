import mongoose from "mongoose";
import { registerModels } from "@/lib/register-models";

// Accept either variable name. Different environments provision the Mongo
// connection string under a different key: local/self-hosted setups typically
// use MONGODB_URI, while the managed project environment injects it as
// MONGODB_CONNECTION_STRING. Reading both means the app connects in every
// environment instead of silently falling back to empty result sets.
const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGODB_CONNECTION_STRING;

const MONGODB_NOT_CONFIGURED =
  "MongoDB connection string is not configured. Set MONGODB_URI or MONGODB_CONNECTION_STRING.";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
   
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  // Ensure every Mongoose model is registered before any query/populate runs.
  // This prevents "MissingSchemaError: Schema hasn't been registered for
  // model ..." errors that occur when a referenced model (e.g. Category) was
  // tree-shaken out of a route's bundle.
  registerModels();

  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error(MONGODB_NOT_CONFIGURED);
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Reuse a warm pool across serverless invocations instead of paying a new
      // TCP + TLS handshake per request.
      //
      // Keep the pool deliberately small. Pages like the homepage fan out into
      // many Promise.all queries at once; with a large cap the driver tries to
      // open a socket per query (observed up to ~30 concurrent TLS handshakes),
      // and the slowest ones get killed by connectTimeoutMS. A small pool makes
      // those queries queue on a few warm, already-authenticated sockets, which
      // is both faster and far more reliable here.
      maxPoolSize: 5,
      // Keep exactly one socket warm. Pre-warming more made the initial
      // connect dramatically slower (a measured 23s for 3 sockets versus ~2s
      // for 1) because each socket pays its own TLS handshake. The pool still
      // grows on demand up to maxPoolSize when a page fans out.
      minPoolSize: 1,
      // Fail fast if the pool is saturated rather than piling up requests.
      waitQueueTimeoutMS: 20000,
      // A cold Atlas connection costs ~2s (DNS SRV + TCP + TLS + auth), and
      // opening additional pool sockets can be considerably slower. The old 3s
      // budget sat right on top of that, so sockets were killed mid-handshake
      // ("connection ... timed out") and queries silently returned nothing —
      // which surfaced in the UI as "No products found" despite a healthy DB.
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // Never retire idle sockets. Measured handshake cost to this Atlas
      // cluster is 1.7s-7.9s and highly variable, while actual queries run in
      // ~250ms. Reaping idle sockets after 60s meant the next request paid that
      // handshake again and could exceed the page-level timeout, blanking out
      // sections. Holding the sockets open trades a little memory for
      // consistently fast queries.
      maxIdleTimeMS: 0,
      // Prefer IPv4 in the preview/serverless network and let the SRV record
      // select a single reachable Atlas host.
      family: 4,
      // Skip the extra round trip Mongoose otherwise spends auto-building
      // indexes on every cold start; indexes are managed explicitly.
      autoIndex: false,
      // Let the driver transparently retry a read/write whose socket dropped
      // mid-flight instead of bubbling up a transient network error that the
      // page-level catch would turn into an empty list.
      retryReads: true,
      retryWrites: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
