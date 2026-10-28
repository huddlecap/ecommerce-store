"use server";

import { and, eq, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { getTxDb } from "@/db/transaction";
import { productVariants, products } from "@/db/schema";

export type ProductVariantInput = {
  id?: string;
  name: string;
  sku: string;
  price: string | number;
  stock: number | string;
};

export type ProductInput = {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  variants?: ProductVariantInput[];
};

type NormalizedVariant = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: number;
};

type NormalizedProduct = {
  name: string;
  slug: string;
  description: string | null | undefined;
  imageUrl: string | null | undefined;
  variants: NormalizedVariant[] | undefined;
};

function requireText(value: string, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} is required`);
  }

  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProduct(input: ProductInput): NormalizedProduct {
  const name = requireText(input.name, "Product name");
  const slug = slugify(input.slug.trim() || name);

  if (!slug) {
    throw new Error("A valid product slug is required");
  }

  const seenSkus = new Set<string>();
  const seenVariantIds = new Set<string>();

  const variants =
    input.variants === undefined
      ? undefined
      : input.variants.map((variant, index) => {
          const label = `Variant ${index + 1}`;
          const variantId = variant.id?.trim() || undefined;

          if (variantId) {
            if (seenVariantIds.has(variantId)) {
              throw new Error(`Duplicate variant ID: ${variantId}`);
            }

            seenVariantIds.add(variantId);
          }

          const variantName = requireText(variant.name, `${label} name`);
          const sku = requireText(variant.sku, `${label} SKU`);

          if (seenSkus.has(sku)) {
            throw new Error(`Duplicate variant SKU: ${sku}`);
          }

          seenSkus.add(sku);

          const rawPrice = String(variant.price).trim();
          const price = Number(rawPrice);

          if (!rawPrice || !Number.isFinite(price) || price < 0) {
            throw new Error(`${label} must have a valid price`);
          }

          const rawStock = String(variant.stock).trim();
          const stock = Number(rawStock);

          if (!rawStock || !Number.isInteger(stock) || stock < 0) {
            throw new Error(`${label} stock must be a non-negative integer`);
          }

          return {
            id: variantId,
            name: variantName,
            sku,
            price: price.toFixed(2),
            stock,
          };
        });

  return {
    name,
    slug,
    description: normalizeOptionalText(input.description),
    imageUrl: normalizeOptionalText(input.imageUrl),
    variants,
  };
}

function requireProductId(id: string) {
  return requireText(id, "Product ID");
}

function getErrorCode(error: unknown) {
  let current: unknown = error;

  while (current && typeof current === "object") {
    const value = current as { code?: unknown; cause?: unknown };

    if (typeof value.code === "string") {
      return value.code;
    }

    current = value.cause;
  }

  return undefined;
}

function revalidateProductPages() {
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function createProduct(input: ProductInput) {
  await requireAdmin();

  const product = normalizeProduct(input);

  try {
    const created = await getTxDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(products)
        .values({
          name: product.name,
          slug: product.slug,
          description: product.description ?? null,
          imageUrl: product.imageUrl ?? null,
        })
        .returning({ id: products.id });

      const variants = product.variants ?? [];

      if (variants.length > 0) {
        await tx.insert(productVariants).values(
          variants.map((variant) => ({
            productId: row.id,
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
          })),
        );
      }

      return row;
    });

    revalidateProductPages();
    return created;
  } catch (error) {
    if (getErrorCode(error) === "23505") {
      throw new Error(
        "A product with this slug or a variant with this SKU already exists",
      );
    }

    throw error;
  }
}

export async function updateProduct(id: string, input: ProductInput) {
  await requireAdmin();

  const productId = requireProductId(id);
  const product = normalizeProduct(input);

  try {
    const updated = await getTxDb().transaction(async (tx) => {
      const updates: {
        name: string;
        slug: string;
        updatedAt: Date;
        description?: string | null;
        imageUrl?: string | null;
      } = {
        name: product.name,
        slug: product.slug,
        updatedAt: new Date(),
      };

      if (product.description !== undefined) {
        updates.description = product.description;
      }

      if (product.imageUrl !== undefined) {
        updates.imageUrl = product.imageUrl;
      }

      const [row] = await tx
        .update(products)
        .set(updates)
        .where(eq(products.id, productId))
        .returning({ id: products.id });

      if (!row) {
        throw new Error("Product not found");
      }

      if (product.variants !== undefined) {
        const submittedIds = product.variants.flatMap((variant) =>
          variant.id ? [variant.id] : [],
        );

        if (submittedIds.length > 0) {
          await tx
            .delete(productVariants)
            .where(
              and(
                eq(productVariants.productId, productId),
                notInArray(productVariants.id, submittedIds),
              ),
            );
        } else {
          await tx
            .delete(productVariants)
            .where(eq(productVariants.productId, productId));
        }

        for (const variant of product.variants) {
          if (variant.id) {
            const [updatedVariant] = await tx
              .update(productVariants)
              .set({
                name: variant.name,
                sku: variant.sku,
                price: variant.price,
                stock: variant.stock,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(productVariants.id, variant.id),
                  eq(productVariants.productId, productId),
                ),
              )
              .returning({ id: productVariants.id });

            if (!updatedVariant) {
              throw new Error(
                "A variant in this request does not belong to the product",
              );
            }
          } else {
            await tx.insert(productVariants).values({
              productId,
              name: variant.name,
              sku: variant.sku,
              price: variant.price,
              stock: variant.stock,
            });
          }
        }
      }

      return row;
    });

    revalidateProductPages();
    return updated;
  } catch (error) {
    if (getErrorCode(error) === "23505") {
      throw new Error(
        "A product with this slug or a variant with this SKU already exists",
      );
    }

    throw error;
  }
}

export async function deleteProduct(id: string) {
  await requireAdmin();

  const productId = requireProductId(id);

  const deleted = await getTxDb().transaction(async (tx) => {
    await tx
      .delete(productVariants)
      .where(eq(productVariants.productId, productId));

    const [row] = await tx
      .delete(products)
      .where(eq(products.id, productId))
      .returning({ id: products.id });

    if (!row) {
      throw new Error("Product not found");
    }

    return row;
  });

  revalidateProductPages();
  return deleted;
}
