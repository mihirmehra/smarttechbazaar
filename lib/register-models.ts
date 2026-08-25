/**
 * Central model registration.
 *
 * In a serverless/bundled environment, importing a Mongoose model purely for
 * its registration side-effect (e.g. `import Category from "@/models/Category"`)
 * can be tree-shaken away when the imported binding is never referenced. When
 * that happens, `.populate("category")` throws:
 *
 *   MissingSchemaError: Schema hasn't been registered for model "Category".
 *
 * This module imports every model AND references them inside a function that is
 * actually called from `dbConnect()`. Because the bindings are used, the
 * bundler cannot drop the imports, so every schema is guaranteed to be
 * registered before any query/populate runs.
 */
import ActivityLog from "@/models/ActivityLog";
import Banner from "@/models/Banner";
import Brand from "@/models/Brand";
import Cart from "@/models/Cart";
import Category from "@/models/Category";
import Coupon from "@/models/Coupon";
import InventoryLog from "@/models/InventoryLog";
import Notification from "@/models/Notification";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Review from "@/models/Review";
import Settings from "@/models/Settings";
import ShippingRate from "@/models/ShippingRate";
import Ticket from "@/models/Ticket";
import User from "@/models/User";
import Wishlist from "@/models/Wishlist";

let registered = false;

export function registerModels() {
  if (registered) return;

  // Referencing each imported model forces the module (and therefore its
  // `mongoose.model(...)` registration side-effect) to be retained by the
  // bundler and evaluated. The array is intentionally consumed.
  const models = [
    ActivityLog,
    Banner,
    Brand,
    Cart,
    Category,
    Coupon,
    InventoryLog,
    Notification,
    Order,
    Product,
    Review,
    Settings,
    ShippingRate,
    Ticket,
    User,
    Wishlist,
  ];

  // Touch the length so this loop can never be optimized out.
  if (models.length > 0) {
    registered = true;
  }
}
