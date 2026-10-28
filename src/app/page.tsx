import { Suspense } from "react";
import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { AddToCartButton } from "@/components/add-to-cart-button";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatPrice(value: string | null) {
  return value === null ? null : priceFormatter.format(Number(value));
}

async function ProductGrid() {
  const catalog = await db.query.products.findMany({
    where: eq(products.isArchived, false),
    with: {
      variants: {
        where: (variant, { eq }) => eq(variant.isArchived, false),
      },
    },
    orderBy: (product, { asc }) => [asc(product.name)],
  });

  if (catalog.length === 0) {
    return (
      <p className="col-span-full py-16 text-center text-zinc-500">
        No products yet. Run <code className="font-mono">npm run db:seed</code>{" "}
        to add some.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {catalog.map((product) => {
        const prices = product.variants.map((variant) => Number(variant.price));
        const minPrice = prices.length > 0 ? formatPrice(String(Math.min(...prices))) : null;

        return (
          <article
            key={product.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/[.145] dark:bg-zinc-950"
          >
            <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={600}
                  height={600}
                  unoptimized
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-400 text-3xl font-semibold text-white/70 dark:from-zinc-800 dark:to-zinc-700">
                  {product.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-5">
              <h2 className="font-semibold tracking-tight">{product.name}</h2>
              {product.description && (
                <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {product.description}
                </p>
              )}
              <p className="mt-auto pt-3 text-sm font-medium">
                {minPrice ? (
                  <>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      From{" "}
                    </span>
                    {minPrice}
                  </>
                ) : (
                  <span className="text-zinc-500">Coming soon</span>
                )}
              </p>
              <AddToCartButton productId={product.id} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-black/[.08] dark:border-white/[.145]"
        >
          <div className="aspect-square animate-pulse bg-zinc-100 dark:bg-zinc-900" />
          <div className="space-y-2 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StorefrontPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Shop the catalog
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Everyday essentials, made to last.
          </p>
        </div>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </main>
    </div>
  );
}
