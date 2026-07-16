import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";

const defaultCategories = [
  {
    name: "Electronics",
    slug: "electronics",
    description: "Electronic devices, gadgets, and accessories",
    icon: "Laptop",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "Home & Living",
    slug: "home-living",
    description: "Home decor, furniture, and living essentials",
    icon: "Home",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "Fashion",
    slug: "fashion",
    description: "Clothing, footwear, and fashion accessories",
    icon: "Shirt",
    sortOrder: 3,
    isActive: true,
  },
  {
    name: "Health & Beauty",
    slug: "health-beauty",
    description: "Health, wellness, and beauty products",
    icon: "Heart",
    sortOrder: 4,
    isActive: true,
  },
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    description: "Sports equipment and outdoor gear",
    icon: "Dumbbell",
    sortOrder: 5,
    isActive: true,
  },
  {
    name: "Books & Stationery",
    slug: "books-stationery",
    description: "Books, office supplies, and stationery items",
    icon: "BookOpen",
    sortOrder: 6,
    isActive: true,
  },
];

// POST seed default categories
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only Super Admin can seed categories" },
        { status: 403 }
      );
    }

    await dbConnect();

    const results = {
      created: [] as string[],
      skipped: [] as string[],
    };

    for (const category of defaultCategories) {
      const existingCategory = await Category.findOne({ slug: category.slug });

      if (existingCategory) {
        results.skipped.push(category.name);
      } else {
        await Category.create(category);
        results.created.push(category.name);
      }
    }

    return NextResponse.json({
      message: "Default categories seeded successfully",
      results,
    });
  } catch (error) {
    console.error("Error seeding categories:", error);
    return NextResponse.json(
      { error: "Failed to seed categories" },
      { status: 500 }
    );
  }
}
