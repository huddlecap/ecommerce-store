import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatPrice(value: number | string) {
  return priceFormatter.format(Number(value));
}

async function OrderDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: {
        with: {
          variant: true,
        },
        orderBy: (items, { asc }) => [asc(items.createdAt)],
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="rounded-2xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center justify-center font-bold">
          ✓
        </div>
        <div>
          <h2 className="text-lg font-semibold">Order confirmed</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Order #{order.id.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {new Date(order.createdAt).toLocaleDateString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Status: <span className="font-medium text-green-600 dark:text-green-400 capitalize">{order.status}</span>
        </p>
      </div>

      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145] mb-6">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4">
            <div className="flex-1">
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {item.variantName} · {item.sku}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {item.quantity} × {formatPrice(item.price)}
              </p>
            </div>
            <p className="font-medium">{formatPrice(Number(item.price) * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between pt-4 border-t border-black/[.08] dark:border-white/[.145]">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Total</span>
        <span className="text-lg font-semibold">{formatPrice(order.totalAmount)}</span>
      </div>
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
  );
}

export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">Order confirmation</h1>
        <Suspense fallback={<OrderSkeleton />}>
          <OrderDetails params={params} />
        </Suspense>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Continue shopping
        </Link>
      </main>
    </div>
  );
}
