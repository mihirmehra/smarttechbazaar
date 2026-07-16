import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Wishlist from "@/models/Wishlist";
import Product from "@/models/Product";

// GET user's wishlist
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const wishlist = await Wishlist.findOne({ user: session.user.id }).populate({
      path: "items.product",
      select: "name slug images priceB2C priceB2B mrp stock brand isActive",
    });

    if (!wishlist) {
      return NextResponse.json({ items: [], count: 0 });
    }

    // Filter out any null products (deleted products)
    const items = wishlist.items
      .filter((item: { product: unknown }) => item.product !== null)
      .map((item: { product: unknown; addedAt: Date }) => ({
        product: item.product,
        addedAt: item.addedAt,
      }));

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}

// POST add product to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let wishlist = await Wishlist.findOne({ user: session.user.id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: session.user.id,
        items: [{ product: productId }],
      });
      return NextResponse.json({ message: "Added to wishlist", wishlisted: true, count: 1 });
    }

    const alreadyWishlisted = wishlist.items.some(
      (item: { product: { toString: () => string } }) =>
        item.product.toString() === productId
    );

    if (alreadyWishlisted) {
      return NextResponse.json(
        { message: "Already in wishlist", wishlisted: true, count: wishlist.items.length }
      );
    }

    wishlist.items.push({ product: productId, addedAt: new Date() });
    await wishlist.save();

    return NextResponse.json({
      message: "Added to wishlist",
      wishlisted: true,
      count: wishlist.items.length,
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    return NextResponse.json(
      { error: "Failed to add to wishlist" },
      { status: 500 }
    );
  }
}

// DELETE remove product from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const wishlist = await Wishlist.findOne({ user: session.user.id });

    if (!wishlist) {
      return NextResponse.json({ error: "Wishlist not found" }, { status: 404 });
    }

    wishlist.items = wishlist.items.filter(
      (item: { product: { toString: () => string } }) =>
        item.product.toString() !== productId
    );
    await wishlist.save();

    return NextResponse.json({
      message: "Removed from wishlist",
      wishlisted: false,
      count: wishlist.items.length,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return NextResponse.json(
      { error: "Failed to remove from wishlist" },
      { status: 500 }
    );
  }
}
