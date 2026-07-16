import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import Product from "@/models/Product";

export async function GET() {
  try {
    await dbConnect();

    // Fetch all active brands
    const brands = await Brand.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Get product counts for each brand
    const brandsWithCounts = await Promise.all(
      brands.map(async (brand) => {
        const productCount = await Product.countDocuments({
          brand: brand.name,
          isActive: true,
        });
        return {
          _id: brand._id.toString(),
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logo: brand.logo,
          website: brand.website,
          productCount,
        };
      })
    );

    return NextResponse.json({ brands: brandsWithCounts });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
