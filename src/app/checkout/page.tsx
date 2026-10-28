import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { carts } from "@/db/schema";
import { CART_COOKIE } from "@/lib/cart";
import { PlaceOrderButton } from "./place-order-button";

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
      <a
        href="/cart"
        className="mt-6 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        View cart
      </a>
    </div>
  );
}

async function CheckoutContent() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth?callbackUrl=/checkout");
  }

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
  const itemsOverStock = cart.items.filter(
    (item) => item.quantity > item.variant.stock,
  );

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
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    width={96}
                    height={96}
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
        <h2 className="text-lg font-semibold tracking-tight">Order summary</h2>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Shipping and taxes calculated at checkout.
        </p>
        {itemsOverStock.length > 0 && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
          >
            <p className="font-medium">
              Some items exceed the available stock:
            </p>
            <ul className="mt-1 list-disc pl-4">
              {itemsOverStock.map((item) => (
                <li key={item.id}>
                  {item.variant.product.name} ({item.variant.name}):{" "}
                  {item.variant.stock} left
                </li>
              ))}
            </ul>
            <a href="/cart" className="mt-2 inline-block font-medium underline">
              Update your cart
            </a>
          </div>
        )}
        <PlaceOrderButton />
      </aside>
    </div>
  );
}

function CheckoutSkeleton() {
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

export default function CheckoutPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">Checkout</h1>
        <Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutContent />
        </Suspense>
      </main>
    </div>
  );
}
