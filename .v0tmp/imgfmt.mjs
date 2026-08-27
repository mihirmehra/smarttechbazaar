import mongoose from "mongoose";
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const agg = await db.collection("products").aggregate([
  { $project: {
      n: { $size: { $ifNull: ["$images", []] } },
      kind: {
        $let: {
          vars: { f: { $arrayElemAt: [{ $ifNull: ["$images", []] }, 0] } },
          in: {
            $cond: [{ $eq: [{ $type: "$$f" }, "missing"] }, "none",
              { $cond: [{ $regexMatch: { input: "$$f", regex: /^data:/ } }, "dataUri",
                { $cond: [{ $regexMatch: { input: "$$f", regex: /^https?:\/\// } }, "url", "other" ] }] }]
          }
        }
      }
  }},
  { $group: { _id: "$kind", count: { $sum: 1 }, avgImgs: { $avg: "$n" } } },
], { allowDiskUse: true }).toArray();
console.log("PRODUCT first-image kind:", JSON.stringify(agg));

const bagg = await db.collection("brands").aggregate([
  { $project: { kind: { $cond: [ { $eq: [{ $type: "$logo" }, "missing"] }, "none",
      { $cond: [{ $regexMatch: { input: "$logo", regex: /^data:/ } }, "dataUri", "url"] } ] } } },
  { $group: { _id: "$kind", count: { $sum: 1 } } },
]).toArray();
console.log("BRAND logo kind:", JSON.stringify(bagg));

const cagg = await db.collection("categories").aggregate([
  { $project: { kind: { $cond: [ { $eq: [{ $type: "$image" }, "missing"] }, "none",
      { $cond: [{ $regexMatch: { input: "$image", regex: /^data:/ } }, "dataUri", "url"] } ] } } },
  { $group: { _id: "$kind", count: { $sum: 1 } } },
]).toArray();
console.log("CATEGORY image kind:", JSON.stringify(cagg));
await mongoose.disconnect();
