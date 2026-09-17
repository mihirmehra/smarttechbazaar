import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import Product, { IProduct } from "@/models/Product";
import Category from "@/models/Category";
import { productMediaUrl } from "@/lib/data";
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

    // Collect every id across all sections up front so the whole payload costs
    // two queries total, instead of two queries per section.
    const allProductIds = [
      ...new Set(sections.flatMap((s) => s.productIds ?? [])),
    ];
    const allCategoryIds = [
      ...new Set(sections.map((s) => s.categoryId).filter(Boolean)),
    ];

    const [products, categories] = await Promise.all([
      allProductIds.length
        ? Product.find({ _id: { $in: allProductIds } })
            // Only project the first image so a base64 blob is detected without
            // pulling the whole (up to 1.6MB) images array into this response.
            .select({ name: 1, priceB2C: 1, brand: 1, stock: 1, images: { $slice: 1 } })
            .lean()
        : Promise.resolve([] as FlattenMaps<IProduct>[]),
      allCategoryIds.length
        ? Category.find({ _id: { $in: allCategoryIds } })
            .select("_id name")
            .lean()
        : Promise.resolve([]),
    ]);

    const productById = new Map(
      products.map((p) => {
        const first = Array.isArray(p.images) ? p.images[0] : undefined;
        const hasImage = typeof first === "string" && first.length > 0;
        const isUrl = hasImage && /^https?:\/\//.test(first as string);
        return [
          p._id.toString(),
          {
            _id: p._id.toString(),
            name: p.name,
            // Return a lightweight image URL instead of the base64 blob so the
            // homepage builder loads instantly; real URLs pass through. Keep
            // the field an array so the existing consumer (images[0]) works.
            images: hasImage
              ? [isUrl ? (first as string) : productMediaUrl(p._id.toString(), 0)]
              : [],
            priceB2C: p.priceB2C,
            brand: p.brand,
            stock: p.stock,
          },
        ];
      })
    );
    const categoryNameById = new Map(
      categories.map((c) => [c._id.toString(), c.name])
    );

    const sectionsWithProducts = sections.map((section) => ({
      id: `section-${section.sortOrder}`,
      categoryId: section.categoryId,
      categoryName: section.categoryId
        ? categoryNameById.get(section.categoryId.toString()) || ""
        : "",
      title: section.title,
      slug: section.slug,
      enabled: section.enabled,
      sortOrder: section.sortOrder,
      productIds: section.productIds || [],
      // Mapping over productIds (rather than the query result) preserves the
      // order the admin arranged; `$in` returns rows in index order.
      products: (section.productIds ?? [])
        .map((id) => productById.get(id.toString()))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
      subcategories: section.subcategories || [],
    }));

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
