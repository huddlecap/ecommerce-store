"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CldUploadWidget } from "next-cloudinary";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { createProduct, updateProduct } from "@/actions/products";

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Variant name is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
      "Enter a valid price",
    ),
  stock: z
    .string()
    .trim()
    .min(1, "Stock is required")
    .refine((value) => /^\d+$/.test(value), "Enter a whole number"),
});

const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens",
    ),
  description: z.string(),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        !value ||
        value.startsWith("/") ||
        value.startsWith("https://") ||
        value.startsWith("http://"),
      "Enter a valid image URL",
    ),
  variants: z.array(variantSchema).min(1, "Add at least one variant"),
});

type ProductFormValues = z.infer<typeof productSchema>;

type ProductFormData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  variants: {
    id: string;
    name: string;
    sku: string;
    price: string;
    stock: string;
  }[];
};

const inputClass =
  "w-full rounded-xl border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20 dark:border-white/[.16] dark:focus:border-zinc-500";
const labelClass = "block text-sm font-medium";
const errorClass = "mt-1 text-xs text-red-600 dark:text-red-400";
const primaryButtonClass =
  "rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "rounded-full border border-black/[.12] px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.16] dark:hover:bg-white/[.05]";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({ product }: { product?: ProductFormData }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const isEditing = Boolean(product);
  const cloudinaryConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  );

  const {
    control,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setValue,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? "",
      imageUrl: product?.imageUrl ?? "",
      variants:
        product && product.variants.length > 0
          ? product.variants
          : [{ name: "", sku: "", price: "", stock: "0" }],
    },
  });

  const { append, fields, remove } = useFieldArray({
    control,
    name: "variants",
    keyName: "fieldKey",
  });

  const name = useWatch({ control, name: "name" });
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const previewUrl = imageUrl?.trim();
  const showPreview = Boolean(
    previewUrl &&
      (previewUrl.startsWith("/") || /^https?:\/\//i.test(previewUrl)),
  );

  useEffect(() => {
    if (!getValues("slug")) {
      setValue("slug", slugify(name), { shouldValidate: false });
    }
  }, [getValues, name, setValue]);

  async function onSubmit(values: ProductFormValues) {
    setFormError(null);

    try {
      const input = {
        name: values.name,
        slug: values.slug,
        description: values.description,
        imageUrl: values.imageUrl,
        variants: values.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          price: variant.price,
          stock: variant.stock,
        })),
      };

      if (product) {
        await updateProduct(product.id, input);
      } else {
        await createProduct(input);
      }

      router.push("/admin/products");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not save product.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Products
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {isEditing ? "Edit product" : "New product"}
          </h1>
        </div>
        <Link
          href="/admin/products"
          className="text-sm font-medium text-zinc-600 hover:text-foreground hover:underline dark:text-zinc-400"
        >
          Back to products
        </Link>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-6"
      >
        {formError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {formError}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section className="space-y-4 rounded-2xl border border-black/[.08] p-5 dark:border-white/[.12]">
            <div>
              <h2 className="text-lg font-semibold">Details</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Product information shown in the storefront.
              </p>
            </div>

            <div>
              <label htmlFor="name" className={labelClass}>
                Name
              </label>
              <input
                id="name"
                {...register("name")}
                className={`${inputClass} mt-1`}
                placeholder="Classic cotton tee"
              />
              {errors.name ? (
                <p className={errorClass}>{errors.name.message}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="slug" className={labelClass}>
                Slug
              </label>
              <input
                id="slug"
                {...register("slug")}
                className={`${inputClass} mt-1`}
                placeholder="classic-cotton-tee"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Lowercase letters, numbers, and hyphens.
              </p>
              {errors.slug ? (
                <p className={errorClass}>{errors.slug.message}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                {...register("description")}
                rows={5}
                className={`${inputClass} mt-1 resize-y`}
                placeholder="Describe the product, materials, and fit."
              />
              {errors.description ? (
                <p className={errorClass}>{errors.description.message}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="imageUrl" className={labelClass}>
                  Image URL
                </label>
                <input
                  id="imageUrl"
                  {...register("imageUrl")}
                  className={`${inputClass} mt-1`}
                  placeholder="https://res.cloudinary.com/..."
                />
                {errors.imageUrl ? (
                  <p className={errorClass}>{errors.imageUrl.message}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {showPreview ? (
                  <Image
                    src={previewUrl}
                    alt="Product preview"
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    No image
                  </div>
                )}

                {cloudinaryConfigured ? (
                  <CldUploadWidget
                    signatureEndpoint="/api/cloudinary/signature"
                    options={{
                      folder: "ecommerce-store/products",
                      multiple: false,
                    }}
                    onSuccess={(result) => {
                      const info = result.info;

                      if (
                        typeof info === "object" &&
                        info !== null &&
                        "secure_url" in info &&
                        typeof info.secure_url === "string"
                      ) {
                        setValue("imageUrl", info.secure_url, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }
                    }}
                  >
                    {({ isLoading, open }) => (
                      <button
                        type="button"
                        onClick={() => open()}
                        disabled={isLoading}
                        className={secondaryButtonClass}
                      >
                        {isLoading ? "Loading uploader…" : "Upload image"}
                      </button>
                    )}
                  </CldUploadWidget>
                ) : (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Set{" "}
                    <code className="font-mono">
                      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
                    </code>{" "}
                    to enable uploads.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-black/[.08] p-5 dark:border-white/[.12]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Variants</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Each variant has its own SKU, price, and stock.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  append({ name: "", sku: "", price: "", stock: "0" })
                }
                className={secondaryButtonClass}
              >
                Add variant
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.fieldKey}
                  className="rounded-xl border border-black/[.08] p-4 dark:border-white/[.12]"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Variant {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    type="hidden"
                    {...register(`variants.${index}.id`)}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`variants.${index}.name`}
                        className={labelClass}
                      >
                        Name
                      </label>
                      <input
                        id={`variants.${index}.name`}
                        {...register(`variants.${index}.name`)}
                        className={`${inputClass} mt-1`}
                        placeholder="Small / Black"
                      />
                      {errors.variants?.[index]?.name ? (
                        <p className={errorClass}>
                          {errors.variants[index].name?.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={`variants.${index}.sku`}
                        className={labelClass}
                      >
                        SKU
                      </label>
                      <input
                        id={`variants.${index}.sku`}
                        {...register(`variants.${index}.sku`)}
                        className={`${inputClass} mt-1`}
                        placeholder="TEE-SM-BLK"
                      />
                      {errors.variants?.[index]?.sku ? (
                        <p className={errorClass}>
                          {errors.variants[index].sku?.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={`variants.${index}.price`}
                        className={labelClass}
                      >
                        Price
                      </label>
                      <input
                        id={`variants.${index}.price`}
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        {...register(`variants.${index}.price`)}
                        className={`${inputClass} mt-1`}
                        placeholder="29.00"
                      />
                      {errors.variants?.[index]?.price ? (
                        <p className={errorClass}>
                          {errors.variants[index].price?.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={`variants.${index}.stock`}
                        className={labelClass}
                      >
                        Stock
                      </label>
                      <input
                        id={`variants.${index}.stock`}
                        type="number"
                        step="1"
                        min="0"
                        inputMode="numeric"
                        {...register(`variants.${index}.stock`)}
                        className={`${inputClass} mt-1`}
                        placeholder="10"
                      />
                      {errors.variants?.[index]?.stock ? (
                        <p className={errorClass}>
                          {errors.variants[index].stock?.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/admin/products"
            className="text-sm font-medium text-zinc-600 hover:text-foreground hover:underline dark:text-zinc-400"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={primaryButtonClass}
          >
            {isSubmitting
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Create product"}
          </button>
        </div>
      </form>
    </div>
  );
}
