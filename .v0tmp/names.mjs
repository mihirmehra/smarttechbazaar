import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const prods = mongoose.connection.db.collection('products');
const probes = {
  desktop:/desktop|all[\s-]?in[\s-]?one|\baio\b|tower|workstation/i,
  laptop:/laptop|notebook|macbook/i,
  display:/monitor|display|screen|\bled\b|\blcd\b|\bips\b/i,
  processor:/processor|\bcpu\b|ryzen|core i[3579]|xeon|pentium|celeron|athlon/i,
  storage:/\bssd\b|\bhdd\b|nvme|hard disk|hard drive|pen ?drive|flash drive|\bnas\b/i,
  printerScanner:/printer|scanner|cartridge|toner|inkjet|laserjet|deskjet|ecotank/i,
  peripherals:/keyboard|mouse|combo|headset|headphone|webcam|speaker|mousepad|gamepad/i,
};
for (const [k,re] of Object.entries(probes)) {
  const n = await prods.countDocuments({name:re});
  const sample = await prods.find({name:re}).limit(5).project({name:1}).toArray();
  console.log(`${k}: ${n} -> ${sample.map(s=>s.name).join(' | ')}`);
}
console.log('\n--- 25 random names ---');
const r = await prods.aggregate([{$sample:{size:25}},{$project:{name:1}}]).toArray();
r.forEach(x=>console.log(' *',x.name));
await mongoose.disconnect();
