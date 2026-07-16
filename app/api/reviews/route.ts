import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";
import Product from "@/models/Product";
import Order from "@/models/Order";

// GET reviews for a product
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "recent";

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    const query = {
      product: productId,
      isApproved: true,
      isHidden: false,
    };

    // Sort options
    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === "helpful") {
      sort = { helpfulVotes: -1, createdAt: -1 };
    } else if (sortBy === "highest") {
      sort = { rating: -1, createdAt: -1 };
    } else if (sortBy === "lowest") {
      sort = { rating: 1, createdAt: -1 };
    }

    const [reviews, total, stats] = await Promise.all([
      Review.find(query)
        .populate("user", "name avatar")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
      // Get rating statistics
      Review.aggregate([
        { $match: { product: productId, isApproved: true, isHidden: false } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            rating5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            rating4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            rating3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            rating2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            rating1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const ratingStats = stats[0] || {
      avgRating: 0,
      totalReviews: 0,
      rating5: 0,
      rating4: 0,
      rating3: 0,
      rating2: 0,
      rating1: 0,
    };

    return NextResponse.json({
      reviews: JSON.parse(JSON.stringify(reviews)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        averageRating: ratingStats.avgRating ? Number(ratingStats.avgRating.toFixed(1)) : 0,
        totalReviews: ratingStats.totalReviews,
        distribution: {
          5: ratingStats.rating5,
          4: ratingStats.rating4,
          3: ratingStats.rating3,
          2: ratingStats.rating2,
          1: ratingStats.rating1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

// POST create a new review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, rating, title, comment, images, orderId } = await request.json();

    if (!productId || !rating || !comment) {
      return NextResponse.json(
        { error: "Product ID, rating, and comment are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    await dbConnect();

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: session.user.id,
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this product" },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if user has purchased this product (verified purchase)
    let isVerifiedPurchase = false;
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        user: session.user.id,
        status: "delivered",
        "items.product": productId,
      });
      isVerifiedPurchase = !!order;
    } else {
      // Check any delivered order with this product
      const anyOrder = await Order.findOne({
        user: session.user.id,
        status: "delivered",
        "items.product": productId,
      });
      isVerifiedPurchase = !!anyOrder;
    }

    const review = await Review.create({
      product: productId,
      user: session.user.id,
      order: orderId,
      rating,
      title: title?.trim(),
      comment: comment.trim(),
      images: images || [],
      isVerifiedPurchase,
      isApproved: true,
      isHidden: false,
    });

    // Populate user info for response
    await review.populate("user", "name avatar");

    return NextResponse.json(
      { message: "Review submitted successfully", review },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
