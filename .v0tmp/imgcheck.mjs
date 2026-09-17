import mongoose from "mongoose";
const uri = process.env.MONGODB_URI || process.env.MONGODB_CONNECTION_STRING;
await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
const db = mongoose.connection.db;
for (const [coll, field] of [["brands","logo"],["categories","image"]]) {
  const withBase64 = await db.collection(coll).countDocuments({ [field]: { $regex: "^data:" } });
  const withUrl = await db.collection(coll).countDocuments({ [field]: { $regex: "^https?://" } });
  const total = await db.collection(coll).countDocuments({});
  const sample = await db.collection(coll).findOne({ [field]: { $regex: "^data:" } }, { projection: { [field]: 1 } });
  const len = sample ? (sample[field]?.length || 0) : 0;
  console.log(`${coll}.${field}: total=${total} base64=${withBase64} url=${withUrl} sampleBase64Len=${len}`);
}
await mongoose.disconnect();
