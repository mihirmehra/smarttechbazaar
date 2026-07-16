import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import User from "@/models/User";
import { validateObjectId, validateQuantity } from "@/lib/validation";

// Disable caching for cart API - critical for mobile apps
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper to add no-cache headers to responses
function withNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");
  return response;
}

// GET user's cart
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return withNoCacheHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    await dbConnect();

    const cart = await Cart.findOne({ user: session.user.id }).populate({
      path: "items.product",
      select: "name slug images priceB2C priceB2B mrp stock brand",
    }).lean();

    if (!cart) {
      return withNoCacheHeaders(
        NextResponse.json({ items: [], total: 0, isB2B: false })
      );
    }

    // Get user's GST verification status for pricing
    const user = await User.findById(session.user.id).lean();
    const isB2B = user?.isGstVerified === true;
    
    type PopulatedCartItem = {
      product: {
        _id: string | { toString(): string };
        name: string;
        slug: string;
        images?: string[];
        priceB2C: number;
        priceB2B: number;
        mrp: number;
        stock: number;
        brand?: string;
      } | null;
      quantity: number;
      addedAt: Date;
    };

    // Filter out items where product was deleted (null) and map to response format
    const validItems = (cart.items as unknown as PopulatedCartItem[]).filter(
      (item) => item.product !== null
    );

    // If there were invalid items, clean up the cart using atomic update
    if (validItems.length !== cart.items.length) {
      const validProductIds = validItems.map(item => item.product!._id);
      await Cart.findOneAndUpdate(
        { user: session.user.id },
        { $pull: { items: { product: { $nin: validProductIds } } } }
      );
    }

    const items = validItems.map((item) => {
      const product = item.product!; // We've filtered out nulls above
      
      // Ensure prices are valid numbers, with MRP fallbacks (consistent with homepage logic)
      const rawMrp = Number(product.mrp) || 0;
      const rawPriceB2C = Number(product.priceB2C) || 0;
      const rawPriceB2B = Number(product.priceB2B) || 0;
      
      // Apply fallbacks: if price is 0, use MRP as fallback
      const mrp = rawMrp;
      const priceB2C = rawPriceB2C > 0 ? rawPriceB2C : rawMrp;
      const priceB2B = rawPriceB2B > 0 ? rawPriceB2B : (rawPriceB2C > 0 ? rawPriceB2C : rawMrp);
      
      const price = isB2B ? priceB2B : priceB2C;
      const quantity = Number(item.quantity) || 1;
      // Ensure _id is a string (lean() returns ObjectId objects)
      const productId = typeof product._id === 'string' ? product._id : product._id.toString();
      
      return {
        product: {
          _id: productId,
          name: product.name,
          slug: product.slug,
          images: product.images,
          brand: product.brand,
          stock: Number(product.stock) || 0,
          priceB2C,
          priceB2B,
          mrp,
        },
        quantity,
        price,
        total: price * quantity,
      };
    });

    const total = items.reduce((sum: number, item: { total: number }) => sum + (item.total || 0), 0);

    return withNoCacheHeaders(
      NextResponse.json({ items, total, isB2B })
    );
  } catch (error) {
    console.error("Error fetching cart:", error);
    return withNoCacheHeaders(
      NextResponse.json(
        { error: "Failed to fetch cart" },
        { status: 500 }
      )
    );
  }
}

// POST add item to cart
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return withNoCacheHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
      return withNoCacheHeaders(
        NextResponse.json(
          { error: "Product ID is required" },
          { status: 400 }
        )
      );
    }

    // Validate product ID format to prevent injection
    if (!validateObjectId(productId)) {
      return withNoCacheHeaders(
        NextResponse.json(
          { error: "Invalid product ID format" },
          { status: 400 }
        )
      );
    }

    // Validate quantity
    const qtyValidation = validateQuantity(quantity);
    if (!qtyValidation.valid) {
      return withNoCacheHeaders(
        NextResponse.json(
          { error: qtyValidation.error },
          { status: 400 }
        )
      );
    }

    await dbConnect();

    // Check if product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return withNoCacheHeaders(
        NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        )
      );
    }

    if (product.stock < quantity) {
      return withNoCacheHeaders(
        NextResponse.json(
          { error: "Insufficient stock" },
          { status: 400 }
        )
      );
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: session.user.id });

    if (!cart) {
      cart = await Cart.create({
        user: session.user.id,
        items: [{ product: productId, quantity }],
      });
    } else {
      // Check if product already in cart
      const existingItem = cart.items.find(
        (item: { product: { toString: () => string } }) => item.product.toString() === productId
      );

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          return withNoCacheHeaders(
            NextResponse.json(
              { error: "Cannot add more than available stock" },
              { status: 400 }
            )
          );
        }
        existingItem.quantity = newQuantity;
      } else {
        // Add new item
        cart.items.push({ product: productId, quantity, addedAt: new Date() });
      }

      await cart.save();
    }

    return withNoCacheHeaders(
      NextResponse.json({ message: "Item added to cart", cart })
    );
  } catch (error) {
    console.error("Error adding to cart:", error);
    return withNoCacheHeaders(
      NextResponse.json(
        { error: "Failed to add item to cart" },
        { status: 500 }
      )
    );
  }
}

// PUT update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return withNoCacheHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { productId, quantity } = await request.json();

    if (!productId || quantity === undefined) {
      return withNoCacheHeaders(
        NextResponse.json(
          { error: "Product ID and quantity are required" },
          { status: 400 }
        )
      );
    }

    // Validate product ID format
    if (!validateObjectId(productId)) {
      return withNoCacheHeaders(
        NextResponse.json(
          { error: "Invalid product ID format" },
          { status: 400 }
        )
      );
    }

    // Validate quantity (allow 0 for removal, but check upper bound)
    if (typeof quantity !== "number" || isNaN(quantity) || quantity < 0 || quantity > 1000) {
      return withNoCacheHeaders(
        NextResponse.json(
          { error: "Invalid quantity" },
          { status: 400 }
        )
      );
    }

    await dbConnect();

    const cart = await Cart.findOne({ user: session.user.id });

    if (!cart) {
      return withNoCacheHeaders(
        NextResponse.json({ error: "Cart not found" }, { status: 404 })
      );
    }

    if (quantity <= 0) {
      // Remove item from cart using atomic $pull
      await Cart.findOneAndUpdate(
        { user: session.user.id },
        { $pull: { items: { product: productId } } }
      );
    } else {
      // Update quantity - check stock first
      const product = await Product.findById(productId);
      if (!product || product.stock < quantity) {
        return withNoCacheHeaders(
          NextResponse.json(
            { error: "Insufficient stock" },
            { status: 400 }
          )
        );
      }

      // Use atomic update with $set on specific array element
      await Cart.findOneAndUpdate(
        { user: session.user.id, "items.product": productId },
        { $set: { "items.$.quantity": quantity } }
      );
    }

    return withNoCacheHeaders(
      NextResponse.json({ message: "Cart updated" })
    );
  } catch (error) {
    console.error("Error updating cart:", error);
    return withNoCacheHeaders(
      NextResponse.json(
        { error: "Failed to update cart" },
        { status: 500 }
      )
    );
  }
}

// DELETE clear cart or remove item
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return withNoCacheHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    // If productId is provided, validate it
    if (productId && !validateObjectId(productId)) {
      return withNoCacheHeaders(
        NextResponse.json(
          { error: "Invalid product ID format" },
          { status: 400 }
        )
      );
    }

    await dbConnect();

    if (productId) {
      // Remove specific item using atomic $pull operation to avoid version conflicts
      const result = await Cart.findOneAndUpdate(
        { user: session.user.id },
        { $pull: { items: { product: productId } } },
        { new: true }
      );

      if (!result) {
        return withNoCacheHeaders(
          NextResponse.json({ error: "Cart not found" }, { status: 404 })
        );
      }

      return withNoCacheHeaders(
        NextResponse.json({ message: "Item removed from cart" })
      );
    } else {
      // Clear entire cart
      await Cart.deleteOne({ user: session.user.id });
      return withNoCacheHeaders(
        NextResponse.json({ message: "Cart cleared" })
      );
    }
  } catch (error) {
    console.error("Error deleting from cart:", error);
    return withNoCacheHeaders(
      NextResponse.json(
        { error: "Failed to delete from cart" },
        { status: 500 }
      )
    );
  }
}
