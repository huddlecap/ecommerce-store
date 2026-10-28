import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { DeleteProductButton } from "./delete-product-button";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatPrice(value: string) {
  return priceFormatter.format(Number(value));
}

export default async function AdminProductsPage() {
  await requireAdmin();

  const catalog = await db.query.products.findMany({
    with: {
      variants: {
        columns: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stock: true,
        },
        orderBy: (variant, { asc }) => [asc(variant.sku)],
      },
    },
    orderBy: (product, { desc }) => [desc(product.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your catalog, variants, and inventory.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Add New Product
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/[.08] dark:border-white/[.12]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/[.06] text-sm dark:divide-white/[.08]">
            <caption className="sr-only">Products</caption>
            <thead className="bg-zinc-50 dark:bg-white/[.03]">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Image
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  SKU
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Stock
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
              {catalog.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="font-medium">No products yet</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Add your first product to start selling.
                    </p>
                  </td>
                </tr>
              ) : (
                catalog.flatMap((product) => {
                  const variants =
                    product.variants.length > 0 ? product.variants : [null];

                  return variants.map((variant, index) => (
                    <tr
                      key={`${product.id}-${variant?.id ?? "none"}`}
                      className="align-top"
                    >
                      {index === 0 ? (
                        <>
                          <td
                            rowSpan={variants.length}
                            className="px-4 py-4"
                          >
                            {product.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                width={56}
                                height={56}
                                unoptimized
                                className="h-14 w-14 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                                {product.name.charAt(0)}
                              </div>
                            )}
                          </td>
                          <td
                            rowSpan={variants.length}
                            className="px-4 py-4"
                          >
                            <p className="font-medium">{product.name}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {`${product.variants.length} ${
                                product.variants.length === 1
                                  ? "variant"
                                  : "variants"
                              }`}
                            </p>
                          </td>
                        </>
                      ) : null}

                      <td className="px-4 py-4">
                        {variant ? (
                          <>
                            <p className="font-medium">{variant.name}</p>
                            <p className="font-mono text-xs text-zinc-500">
                              {variant.sku}
                            </p>
                          </>
                        ) : (
                          <span className="text-zinc-500">No variants</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums">
                        {variant ? formatPrice(variant.price) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                        {variant ? (
                          <span
                            className={
                              variant.stock === 0
                                ? "font-medium text-red-600 dark:text-red-400"
                                : undefined
                            }
                          >
                            {variant.stock}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {index === 0 ? (
                        <td
                          rowSpan={variants.length}
                          className="px-4 py-4"
                        >
                          <div className="flex flex-col items-end gap-2">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="text-xs font-medium text-zinc-600 hover:text-foreground hover:underline dark:text-zinc-400"
                            >
                              Edit
                            </Link>
                            <DeleteProductButton
                              productId={product.id}
                              productName={product.name}
                            />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
