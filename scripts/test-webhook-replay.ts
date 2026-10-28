import "dotenv/config";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, productVariants, products } from "@/db/schema";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const WEBHOOK_URL = `${BASE_URL}/api/webhooks/stripe`;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function fireExpiredWebhook(orderId: string, sessionId: string): Promise<Response> {
  const session: Stripe.Checkout.Session = {
    id: sessionId,
    object: "checkout.session",
    metadata: { orderId },
    payment_status: "unpaid",
    mode: "payment",
    amount_total: 2000,
    currency: "usd",
    customer_details: { email: "webhook-replay-test@example.com" },
    expires_at: Math.floor(Date.now() / 1000),
  } as unknown as Stripe.Checkout.Session;

  // Mock checkout.session.completed payload (constructed but not fired in this test).
  const completedEvent: Stripe.Event = {
    id: `evt_test_completed_${Date.now()}`,
    object: "event",
    api_version: "2025-06-30",
    created: Math.floor(Date.now() / 1000),
    data: { object: session },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "checkout.session.completed",
  };

  // Mock checkout.session.expired payload (fired twice below).
  const expiredEvent: Stripe.Event = {
    id: `evt_test_expired_${Date.now()}`,
    object: "event",
    api_version: "2025-06-30",
    created: Math.floor(Date.now() / 1000),
    data: { object: session },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "checkout.session.expired",
  };

  const payload = JSON.stringify(expiredEvent);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  return fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "stripe-signature": signature,
      "content-type": "application/json",
    },
    body: payload,
  });
}

async function main() {
  const ts = Date.now();
  const slug = `webhook-replay-test-${ts}`;
  const sku = `WEBHOOK-REPLAY-${ts}`;

  let productId: string | undefined;
  let variantId: string | undefined;
  let orderId: string | undefined;

  try {
    const [product] = await db
      .insert(products)
      .values({
        name: "Webhook Replay Test Product",
        slug,
        description: "Temporary product for webhook replay test.",
        imageUrl: "/products/webhook-replay-test.svg",
      })
      .returning();
    productId = product.id;

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId,
        name: "Single Stock",
        sku,
        price: "10.00",
        stock: 1,
      })
      .returning();
    variantId = variant.id;

    const [order] = await db
      .insert(orders)
      .values({
        userId: null,
        status: "pending",
        totalAmount: "10.00",
      })
      .returning();
    orderId = order.id;

    await db.insert(orderItems).values({
      orderId,
      variantId,
      productName: "Webhook Replay Test Product",
      variantName: "Single Stock",
      sku,
      price: "10.00",
      quantity: 1,
    });

    const [variantBefore] = await db
      .select({ stock: productVariants.stock })
      .from(productVariants)
      .where(eq(productVariants.id, variantId));
    const initialStock = Number(variantBefore!.stock);
    if (initialStock !== 1) {
      throw new Error(`Expected initial stock 1, got ${initialStock}`);
    }

    // Fire the expired payload twice concurrently.
    const sessionId = `cs_test_webhook_replay_${ts}`;
    const [firstResp, secondResp] = await Promise.all([
      fireExpiredWebhook(orderId, sessionId),
      fireExpiredWebhook(orderId, sessionId),
    ]);

    for (const res of [firstResp, secondResp]) {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Webhook returned ${res.status}: ${text}`);
      }
    }

    // Stock should be restored exactly once: initial (1) + 1 = 2.
    // If the row lock did not prevent double-restoration, stock would be 3.
    const [variantAfter] = await db
      .select({ stock: productVariants.stock })
      .from(productVariants)
      .where(eq(productVariants.id, variantId));
    const finalStock = Number(variantAfter!.stock);

    if (finalStock !== initialStock + 1) {
      throw new Error(
        `Expected stock restored exactly once (${initialStock + 1}), got ${finalStock}. Double-restore may have occurred.`,
      );
    }

    const [orderAfter] = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId));
    if (orderAfter!.status !== "cancelled") {
      throw new Error(`Expected order status cancelled, got ${orderAfter!.status}`);
    }

    console.log(
      `PASS: stock restored exactly once (${initialStock} → ${finalStock}), order cancelled.`,
    );
  } finally {
    if (orderId) {
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      await db.delete(orders).where(eq(orders.id, orderId));
    }
    if (variantId) {
      await db.delete(productVariants).where(eq(productVariants.id, variantId));
    }
    if (productId) {
      await db.delete(products).where(eq(products.id, productId));
    }
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
