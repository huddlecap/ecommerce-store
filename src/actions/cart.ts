"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cartItems, carts, productVariants, products } from "@/db/schema";
import { CART_COOKIE, CART_COOKIE_MAX_AGE } from "@/lib/cart";

const CART_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: CART_COOKIE_MAX_AGE,
} as const;

export async function getOrCreateCart() {
  const cookieStore = await cookies();
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? null;

  const cartId = cookieStore.get(CART_COOKIE)?.value;

  if (cartId) {
    const [existingCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.id, cartId));

    if (existingCart) {
      if (userId && existingCart.userId !== userId) {
        const [updatedCart] = await db
          .update(carts)
          .set({ userId, updatedAt: new Date() })
          .where(eq(carts.id, cartId))
          .returning();

        return updatedCart;
      }

      return existingCart;
    }
  }

  const [cart] = await db.insert(carts).values({ userId }).returning();

  cookieStore.set(CART_COOKIE, cart.id, CART_COOKIE_OPTIONS);

  return cart;
}

export async function addToCart(productId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a positive integer");
  }

  const cart = await getOrCreateCart();

  const [variant] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(productVariants.isArchived, false),
        eq(products.isArchived, false),
      ),
    )
    .orderBy(asc(productVariants.sku))
    .limit(1);

  if (!variant) {
    throw new Error("Product is not available");
  }

  const [existingItem] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.variantId, variant.id),
      ),
    );

  if (existingItem) {
    const [updatedItem] = await db
      .update(cartItems)
      .set({
        quantity: existingItem.quantity + quantity,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, existingItem.id))
      .returning();

    revalidatePath("/cart");
    return updatedItem;
  }

  const [item] = await db
    .insert(cartItems)
    .values({
      cartId: cart.id,
      variantId: variant.id,
      quantity,
    })
    .returning();

  revalidatePath("/cart");
  return item;
}

export async function mergeCart() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id;

  if (!userId) {
    throw new Error("You must be signed in to merge your cart");
  }

  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE)?.value;

  if (!cartId) {
    return null;
  }

  const [guestCart] = await db
    .select()
    .from(carts)
    .where(eq(carts.id, cartId));

  if (!guestCart) {
    return null;
  }

  if (guestCart.userId && guestCart.userId !== userId) {
    cookieStore.delete(CART_COOKIE);
    return null;
  }

  const [savedCart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.userId, userId), ne(carts.id, guestCart.id)))
    .orderBy(desc(carts.updatedAt))
    .limit(1);

  if (!savedCart) {
    const [updatedCart] = await db
      .update(carts)
      .set({ userId, updatedAt: new Date() })
      .where(eq(carts.id, guestCart.id))
      .returning();

    cookieStore.set(CART_COOKIE, guestCart.id, CART_COOKIE_OPTIONS);
    revalidatePath("/cart");
    return updatedCart;
  }

  const guestItems = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, guestCart.id));

  const savedItems = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, savedCart.id));

  const savedItemsByVariant = new Map(
    savedItems.map((item) => [item.variantId, item]),
  );

  for (const guestItem of guestItems) {
    const existingItem = savedItemsByVariant.get(guestItem.variantId);

    if (existingItem) {
      const [mergedItem] = await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + guestItem.quantity,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();

      savedItemsByVariant.set(guestItem.variantId, mergedItem);
      continue;
    }

    const [movedItem] = await db
      .update(cartItems)
      .set({ cartId: savedCart.id, updatedAt: new Date() })
      .where(eq(cartItems.id, guestItem.id))
      .returning();

    savedItemsByVariant.set(guestItem.variantId, movedItem);
  }

  await db.delete(carts).where(eq(carts.id, guestCart.id));

  const [mergedCart] = await db
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, savedCart.id))
    .returning();

  cookieStore.set(CART_COOKIE, savedCart.id, CART_COOKIE_OPTIONS);
  revalidatePath("/cart");

  return mergedCart;
}
