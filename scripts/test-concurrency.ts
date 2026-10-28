import "dotenv/config";
import { eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  cartItems,
  carts,
  orders,
  orderItems,
  products,
  productVariants,
} from "@/db/schema";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const TEST_ROUTE = `${BASE_URL}/api/test/concurrency`;

type CheckoutState = { error: string | null; url?: string };

async function checkoutViaRoute(cartId: string): Promise<CheckoutState> {
  const res = await fetch(TEST_ROUTE, {
    method: "POST",
    headers: {
      cookie: `cartId=${cartId}`,
      "content-type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`concurrency route returned ${res.status}`);
  }

  return (await res.json()) as CheckoutState;
}

async function main() {
  const ts = Date.now();
  const productSlug = `concurrency-test-product-${ts}`;
  const variantSku = `CONC-TEST-${ts}`;

  let product: typeof products.$inferSelect | undefined;
  let variant: typeof productVariants.$inferSelect | undefined;
  let cartA: typeof carts.$inferSelect | undefined;
  let cartB: typeof carts.$inferSelect | undefined;
  let startTime: Date | undefined;

  try {
    const [createdProduct] = await db
      .insert(products)
      .values({
        name: "Concurrency Test Product",
        slug: productSlug,
        description: "Temporary product for stock lock concurrency test.",
        imageUrl: "/products/concurrency-test.svg",
      })
      .returning();
    product = createdProduct;

    const [createdVariant] = await db
      .insert(productVariants)
      .values({
        productId: product.id,
        name: "Single Stock",
        sku: variantSku,
        price: "1.00",
        stock: 1,
      })
      .returning();
    variant = createdVariant;

    const [createdCartA, createdCartB] = await db
      .insert(carts)
      .values([{ userId: null }, { userId: null }])
      .returning();
    cartA = createdCartA;
    cartB = createdCartB;

    await db.insert(cartItems).values([
      { cartId: cartA.id, variantId: variant.id, quantity: 1 },
      { cartId: cartB.id, variantId: variant.id, quantity: 1 },
    ]);

    startTime = new Date();

    const [resultA, resultB] = await Promise.all([
      checkoutViaRoute(cartA.id),
      checkoutViaRoute(cartB.id),
    ]);

    const results = [resultA, resultB] as CheckoutState[];
    const successes = results.filter(
      (state) =>
        state.error === null &&
        typeof state.url === "string" &&
        state.url.startsWith("http"),
    );
    const failures = results.filter((state) => state.error !== null);

    if (successes.length !== 1) {
      throw new Error(
        `Expected exactly 1 successful checkout, got ${successes.length}. Results: ${JSON.stringify(results)}`,
      );
    }

    if (failures.length !== results.length - 1) {
      throw new Error(
        `Expected ${results.length - 1} failed checkouts, got ${failures.length}. Results: ${JSON.stringify(results)}`,
      );
    }

    for (const failure of failures) {
      if (!failure.error?.includes("Not enough stock")) {
        throw new Error(
          `Expected failure to be a stock error, got: ${failure.error}`,
        );
      }
    }

    const [variantAfter] = await db
      .select({ stock: productVariants.stock })
      .from(productVariants)
      .where(eq(productVariants.id, variant!.id));

    if (variantAfter!.stock !== 0) {
      throw new Error(
        `Expected variant stock to be 0 after successful checkout, got ${variantAfter!.stock}`,
      );
    }

    console.log(
      `PASS: exactly 1 checkout succeeded, ${failures.length} failed with "Not enough stock", variant stock is 0.`,
    );
    console.log(JSON.stringify({ successes, failures }, null, 2));
  } finally {
    if (!startTime) {
      return;
    }

    const newOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(gte(orders.createdAt, startTime));

    if (newOrders.length > 0) {
      const orderIds = newOrders.map((order) => order.id);
      await db
        .delete(orderItems)
        .where(inArray(orderItems.orderId, orderIds));
      await db.delete(orders).where(inArray(orders.id, orderIds));
    }

    if (cartA && cartB) {
      await db
        .delete(cartItems)
        .where(inArray(cartItems.cartId, [cartA.id, cartB.id]));
      await db.delete(carts).where(inArray(carts.id, [cartA.id, cartB.id]));
    }

    if (product) {
      await db.delete(products).where(eq(products.id, product.id));
    }
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
