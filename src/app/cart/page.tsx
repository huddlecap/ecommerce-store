import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { carts } from "@/db/schema";
import { CART_COOKIE } from "@/lib/cart";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatPrice(value: number | string) {
  return priceFormatter.format(Number(value));
}

function EmptyCart() {
  return (
    <div className="rounded-2xl border border-dashed border-black/[.12] py-20 text-center dark:border-white/[.2]">
      <p className="text-lg font-medium">Your cart is empty</p>
      <p className="mt-1 text-sm text-zinc-500">
        Add something you like from the catalog.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Continue shopping
      </Link>
    </div>
  );
}

async function CartContents() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE)?.value;

  if (!cartId) {
    return <EmptyCart />;
  }

  const cart = await db.query.carts.findFirst({
    where: eq(carts.id, cartId),
    with: {
      items: {
        with: {
          variant: {
            with: { product: true },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return <EmptyCart />;
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.variant.price) * item.quantity,
    0,
  );
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
        {cart.items.map((item) => {
          const product = item.variant.product;
          const lineTotal = Number(item.variant.price) * item.quantity;

          return (
            <li key={item.id} className="flex gap-4 py-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={96}
                    height={96}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-400 text-xl font-semibold text-white/70 dark:from-zinc-800 dark:to-zinc-700">
                    {product.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {item.variant.name}
                </p>
                <p className="mt-auto text-sm text-zinc-600 dark:text-zinc-400">
                  {item.quantity} × {formatPrice(item.variant.price)}
                </p>
              </div>

              <p className="font-medium">{formatPrice(lineTotal)}</p>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
        <h2 className="text-lg font-semibold tracking-tight">Summary</h2>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Shipping and taxes calculated at checkout.
        </p>
        <Link
          href="/checkout"
          className="mt-6 w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Checkout
        </Link>
      </aside>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex gap-4 py-5">
            <div className="h-24 w-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

export default function CartPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">Your cart</h1>
        <Suspense fallback={<CartSkeleton />}>
          <CartContents />
        </Suspense>
      </main>
    </div>
  );
}
