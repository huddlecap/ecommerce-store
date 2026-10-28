"use server";

import { cookies, headers } from "next/headers";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import * as schema from "@/db/schema";
import { getTxDb } from "@/db/transaction";
import { CART_COOKIE } from "@/lib/cart";

export type CheckoutState = { error: string | null; url?: string };

export async function checkout(
  _prevState: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const cookieStore = await cookies();
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? null;
  const cartId = cookieStore.get(CART_COOKIE)?.value;

  try {
    const { url } = await getTxDb().transaction(async (tx) => {
      let cart: typeof schema.carts.$inferSelect | undefined;

      if (cartId) {
        [cart] = await tx
          .select()
          .from(schema.carts)
          .where(eq(schema.carts.id, cartId))
          .for("update");
      }

      if (!cart && userId) {
        [cart] = await tx
          .select()
          .from(schema.carts)
          .where(eq(schema.carts.userId, userId))
          .orderBy(desc(schema.carts.updatedAt))
          .limit(1)
          .for("update");
      }

      if (!cart) {
        throw new Error("Your cart is empty");
      }

      if (cart.userId && cart.userId !== userId) {
        throw new Error("This cart belongs to another user");
      }

      const items = await tx
        .select({
          variantId: schema.productVariants.id,
          variantName: schema.productVariants.name,
          sku: schema.productVariants.sku,
          price: schema.productVariants.price,
          quantity: schema.cartItems.quantity,
          productName: schema.products.name,
          variantArchived: schema.productVariants.isArchived,
          productArchived: schema.products.isArchived,
        })
        .from(schema.cartItems)
        .innerJoin(
          schema.productVariants,
          eq(schema.cartItems.variantId, schema.productVariants.id),
        )
        .innerJoin(
          schema.products,
          eq(schema.productVariants.productId, schema.products.id),
        )
        .where(eq(schema.cartItems.cartId, cart.id));

      if (items.length === 0) {
        throw new Error("Your cart is empty");
      }

      if (items.some((item) => item.variantArchived || item.productArchived)) {
        throw new Error("Some items in your cart are no longer available");
      }

      const quantitiesByVariant = new Map<string, number>();

      for (const item of items) {
        quantitiesByVariant.set(
          item.variantId,
          (quantitiesByVariant.get(item.variantId) ?? 0) + item.quantity,
        );
      }

      // Lock the variant rows in a deterministic order so concurrent
      // checkouts serialize instead of overselling the same inventory.
      const lockedVariants = await tx
        .select({
          id: schema.productVariants.id,
          stock: schema.productVariants.stock,
        })
        .from(schema.productVariants)
        .where(
          inArray(schema.productVariants.id, [...quantitiesByVariant.keys()]),
        )
        .orderBy(asc(schema.productVariants.id))
        .for("update");

      const stockByVariant = new Map(
        lockedVariants.map((variant) => [variant.id, variant.stock]),
      );

      for (const [variantId, quantity] of quantitiesByVariant) {
        const available = stockByVariant.get(variantId) ?? 0;

        if (available < quantity) {
          const item = items.find((entry) => entry.variantId === variantId);
          const label = item
            ? `${item.productName} (${item.variantName ?? item.sku})`
            : variantId;

          throw new Error(
            `Not enough stock for ${label}. Only ${available} left.`,
          );
        }
      }

      for (const [variantId, quantity] of quantitiesByVariant) {
        await tx
          .update(schema.productVariants)
          .set({
            stock: (stockByVariant.get(variantId) ?? 0) - quantity,
            updatedAt: new Date(),
          })
          .where(eq(schema.productVariants.id, variantId));
      }

      const totalCents = items.reduce(
        (sum, item) =>
          sum + Math.round(Number(item.price) * 100) * item.quantity,
        0,
      );
      const totalAmount = (totalCents / 100).toFixed(2);

      const [createdOrder] = await tx
        .insert(schema.orders)
        .values({
          userId,
          status: "pending",
          totalAmount,
        })
        .returning();

      await tx.insert(schema.orderItems).values(
        items.map((item) => ({
          orderId: createdOrder.id,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
        })),
      );

      // Keep the cart and cookie until the webhook confirms payment. Removing
      // them here would replace the checkout UI with the empty-cart state and
      // unmount the client component before it follows the Stripe URL.
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      ).replace(/\/$/, "");

      const stripeSession = await getStripe().checkout.sessions.create({
        mode: "payment",
        line_items: items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(Number(item.price) * 100),
            product_data: {
              name: item.variantName
                ? `${item.productName} — ${item.variantName}`
                : item.productName,
            },
          },
        })),
        metadata: {
          orderId: createdOrder.id,
          cartId: cart.id,
        },
        success_url: `${appUrl}/checkout/success`,
        cancel_url: `${appUrl}/cart`,
      });

      if (!stripeSession.url) {
        throw new Error("Stripe did not return a checkout URL");
      }

      return { url: stripeSession.url };
    });

    return { error: null, url };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Checkout failed",
    };
  }
}
