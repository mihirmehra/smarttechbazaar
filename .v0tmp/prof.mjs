import mongoose from "mongoose";
await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 5, family: 4 });
const db = mongoose.connection.db;
const t = async (label, fn) => { const s = Date.now(); const r = await fn(); console.log(label.padEnd(42), (Date.now()-s)+"ms", "docs="+(Array.isArray(r)?r.length:r)); };
await t("brand find (projected, no logo)", () => db.collection("brands").find({isActive:true},{projection:{name:1,slug:1,description:1,productCount:1}}).sort({sortOrder:1,name:1}).toArray());
await t("product $group by brand", () => db.collection("products").aggregate([{$match:{isActive:true,brand:{$exists:true,$ne:null}}},{$group:{_id:"$brand",count:{$sum:1}}}]).toArray());
await t("product $group by category", () => db.collection("products").aggregate([{$match:{isActive:true,category:{$exists:true,$ne:null}}},{$group:{_id:"$category",count:{$sum:1}}}]).toArray());
await mongoose.disconnect();
