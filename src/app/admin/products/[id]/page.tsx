import { Suspense } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { ProductForm } from "../product-form";

function ProductFormSkeleton() {
  return (
    <div className="h-96 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
  );
}

async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
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
  });

  if (!product) {
    notFound();
  }

  return (
    <ProductForm
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description ?? "",
        imageUrl: product.imageUrl ?? "",
        variants: product.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          price: Number(variant.price).toFixed(2),
          stock: String(variant.stock),
        })),
      }}
    />
  );
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ProductFormSkeleton />}>
      <EditProduct params={params} />
    </Suspense>
  );
}
