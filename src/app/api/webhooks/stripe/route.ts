import { createElement } from "react";
import type Stripe from "stripe";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  carts,
  orderItems,
  orders,
  productVariants,
  user,
} from "@/db/schema";
import { getTxDb } from "@/db/transaction";
import { getResend } from "@/lib/resend";
import { getStripe } from "@/lib/stripe";
import ReceiptEmail from "@/emails/ReceiptEmail";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  const cartId = session.metadata?.cartId;

  if (!orderId || session.payment_status !== "paid") {
    return;
  }

  await db
    .update(orders)
    .set({ status: "paid", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));

  if (cartId) {
    await db.delete(carts).where(eq(carts.id, cartId));
  }

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      email: user.email,
    })
    .from(orders)
    .leftJoin(user, eq(orders.userId, user.id))
    .where(eq(orders.id, orderId));

  if (!order || order.status !== "paid") {
    return;
  }

  if (!order.email) {
    console.warn("Skipping receipt email: order has no customer", orderId);
    return;
  }

  const customerEmail = order.email;

  const purchasedItems = await db
    .select({
      name: orderItems.productName,
      snapshotVariantName: orderItems.variantName,
      variantName: productVariants.name,
      quantity: orderItems.quantity,
      price: orderItems.price,
    })
    .from(orderItems)
    .leftJoin(
      productVariants,
      eq(orderItems.variantId, productVariants.id),
    )
    .where(eq(orderItems.orderId, orderId));

  if (purchasedItems.length === 0) {
    console.warn("Skipping receipt email: order has no items", orderId);
    return;
  }

  const items = purchasedItems.map((item) => ({
    name: item.name,
    variantName: item.snapshotVariantName ?? item.variantName,
    quantity: item.quantity,
    price: item.price,
  }));

  const { data, error } = await getResend().emails.send(
    {
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to: customerEmail,
      subject: `Receipt for order ${order.id}`,
      react: createElement(ReceiptEmail, {
        orderId: order.id,
        items,
        totalAmount: order.totalAmount,
      }),
    },
    { idempotencyKey: `receipt-${order.id}` },
  );

  if (error) {
    console.error("Failed to send receipt email", error);
    throw new Error("Failed to send receipt email");
  }

  console.log("Receipt email sent", {
    orderId: order.id,
    emailId: data.id,
  });
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    return;
  }

  await getTxDb().transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");

    if (!order || order.status !== "pending") {
      return;
    }

    await tx
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    const items = await tx
      .select({
        variantId: orderItems.variantId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    items.sort((a, b) =>
      (a.variantId ?? "").localeCompare(b.variantId ?? ""),
    );

    for (const item of items) {
      if (!item.variantId) {
        continue;
      }

      await tx
        .update(productVariants)
        .set({
          stock: sql`${productVariants.stock} + ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, item.variantId));
    }
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  if (!webhookSecret) {
    return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handling failed", error);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}
