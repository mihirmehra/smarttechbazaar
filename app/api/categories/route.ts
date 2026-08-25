import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import Product from "@/models/Product";

export async function GET() {
  try {
    await dbConnect();

    // Fetch categories and all product counts in two queries instead of one
    // count query per category. The old N+1 pattern became very slow as the
    // catalogue grew and could exceed the route timeout in the admin panel.
    const [categories, productCounts] = await Promise.all([
      Category.find({ isActive: true })
        .select("_id name slug description image icon parent")
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      Product.aggregate([
        { $match: { isActive: true, category: { $ne: null } } },
        { $group: { _id: "$category", productCount: { $sum: 1 } } },
      ]),
    ]);

    const countByCategory = new Map<string, number>(
      productCounts.map((item: { _id: unknown; productCount: number }) => [
        String(item._id),
        item.productCount,
      ])
    );

    const categoriesWithCounts = categories.map((cat) => ({
      _id: cat._id.toString(),
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      icon: cat.icon,
      parent: cat.parent?.toString() || null,
      productCount: countByCategory.get(cat._id.toString()) ?? 0,
    }));

    return NextResponse.json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
