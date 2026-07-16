import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import Product, { IProduct } from "@/models/Product";
import Category from "@/models/Category";
import { FlattenMaps } from "mongoose";

interface HomepageSectionInput {
  categoryId: string;
  title: string;
  slug: string;
  enabled: boolean;
  sortOrder: number;
  productIds: string[];
  subcategories: string[];
}

// GET - Fetch homepage sections
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch homepage settings
    const settings = await Settings.findOne({ key: "homepage_sections" });

    if (!settings?.value) {
      return NextResponse.json({ sections: [] });
    }

    const sections = settings.value as HomepageSectionInput[];

    // Fetch products for each section
    const sectionsWithProducts = await Promise.all(
      sections.map(async (section) => {
        let products: FlattenMaps<IProduct>[] = [];

        if (section.productIds && section.productIds.length > 0) {
          products = await Product.find({
            _id: { $in: section.productIds },
          })
            .select("_id name images priceB2C brand stock")
            .lean();
        }

        // Get category name
        let categoryName = "";
        if (section.categoryId) {
          const category = await Category.findById(section.categoryId).lean();
          categoryName = category?.name || "";
        }

        return {
          id: `section-${section.sortOrder}`,
          categoryId: section.categoryId,
          categoryName,
          title: section.title,
          slug: section.slug,
          enabled: section.enabled,
          sortOrder: section.sortOrder,
          productIds: section.productIds || [],
          products: products.map((p) => ({
            _id: p._id.toString(),
            name: p.name,
            images: p.images,
            priceB2C: p.priceB2C,
            brand: p.brand,
            stock: p.stock,
          })),
          subcategories: section.subcategories || [],
        };
      })
    );

    return NextResponse.json({
      sections: sectionsWithProducts.sort((a, b) => a.sortOrder - b.sortOrder),
    });
  } catch (error) {
    console.error("Error fetching homepage settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch homepage settings" },
      { status: 500 }
    );
  }
}

// POST - Save homepage sections
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { sections } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { error: "Invalid sections data" },
        { status: 400 }
      );
    }

    // Validate and transform sections
    const validatedSections = sections.map((section, index) => ({
      categoryId: section.categoryId || "",
      title: section.title || "",
      slug: section.slug || "",
      enabled: section.enabled !== false,
      sortOrder: index,
      productIds: Array.isArray(section.productIds) ? section.productIds : [],
      subcategories: Array.isArray(section.subcategories)
        ? section.subcategories
        : [],
    }));

    // Upsert settings
    await Settings.findOneAndUpdate(
      { key: "homepage_sections" },
      {
        key: "homepage_sections",
        value: validatedSections,
        category: "homepage",
        description: "Homepage product sections configuration",
        isPublic: true,
        updatedBy: session.user.id,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Homepage settings saved successfully",
    });
  } catch (error) {
    console.error("Error saving homepage settings:", error);
    return NextResponse.json(
      { error: "Failed to save homepage settings" },
      { status: 500 }
    );
  }
}
