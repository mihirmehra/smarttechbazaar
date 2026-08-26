import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import {
  SECTION_RULES,
  productFilterForRule,
  SECTION_PRODUCT_LIMIT,
} from "@/lib/section-matching";

export async function GET() {
  await dbConnect();

  const out: Record<string, { count: number; names: string[] }> = {};

  for (const rule of SECTION_RULES) {
    const cats = await Category.find({ slug: { $in: rule.categorySlugs } })
      .select("_id")
      .lean();
    const filter = productFilterForRule(
      rule,
      cats.map((c) => c._id)
    );
    const count = await Product.countDocuments(filter);
    const docs = await Product.find(filter)
      .select("name")
      .limit(SECTION_PRODUCT_LIMIT)
      .lean();
    out[rule.title] = {
      count,
      names: docs.map((d) => d.name as string),
    };
  }

  return NextResponse.json(out);
}
