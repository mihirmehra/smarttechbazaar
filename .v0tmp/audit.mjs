import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 3 });
const db = mongoose.connection.db;
const out = {};
for (const [coll, fields] of Object.entries({
  products: ['images'], brands: ['logo'], categories: ['image'], banners: ['image','imageMobile'],
})) {
  const c = db.collection(coll);
  const total = await c.countDocuments({});
  const st = await db.command({ collStats: coll });
  const rows = {};
  for (const f of fields) {
    const b64 = await c.countDocuments({ [f]: { $regex: '^data:' } });
    const arr = await c.countDocuments({ [f]: { $elemMatch: { $regex: '^data:' } } }).catch(()=>0);
    rows[f] = { inline_string: b64, inline_in_array: arr };
  }
  out[coll] = { total, sizeMB: +(st.size/1048576).toFixed(1), avgObjKB: +(st.avgObjSize/1024).toFixed(1), fields: rows };
}
console.log(JSON.stringify(out, null, 2));
for (const coll of ['products','brands','categories','banners']) {
  const idx = await db.collection(coll).indexes();
  console.log(coll, 'indexes:', idx.map(i=>JSON.stringify(i.key)).join(' '));
}
await mongoose.disconnect();
