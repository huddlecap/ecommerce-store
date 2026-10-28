import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { products, productVariants } from "./schema";

type SeedVariant = {
  name: string;
  sku: string;
  price: string;
  stock: number;
};

type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  variants: SeedVariant[];
};

const seedProducts: SeedProduct[] = [
  {
    name: "Classic Cotton Tee",
    slug: "classic-cotton-tee",
    description: "A everyday 100% cotton tee with a relaxed fit.",
    imageUrl: "/products/classic-cotton-tee.svg",
    variants: [
      { name: "Black / M", sku: "TEE-BLK-M", price: "24.00", stock: 40 },
      { name: "Black / L", sku: "TEE-BLK-L", price: "24.00", stock: 35 },
      { name: "White / M", sku: "TEE-WHT-M", price: "24.00", stock: 28 },
    ],
  },
  {
    name: "Organic Hoodie",
    slug: "organic-hoodie",
    description: "Heavyweight organic cotton fleece hoodie with a brushed interior.",
    imageUrl: "/products/organic-hoodie.svg",
    variants: [
      { name: "Charcoal / M", sku: "HOOD-CHR-M", price: "68.00", stock: 20 },
      { name: "Charcoal / L", sku: "HOOD-CHR-L", price: "68.00", stock: 18 },
      { name: "Sand / M", sku: "HOOD-SND-M", price: "68.00", stock: 15 },
    ],
  },
  {
    name: "Slim Fit Jeans",
    slug: "slim-fit-jeans",
    description: "Stretch denim jeans with a slim leg and mid-rise waist.",
    imageUrl: "/products/slim-fit-jeans.svg",
    variants: [
      { name: "Indigo / 30", sku: "JEAN-IND-30", price: "79.00", stock: 12 },
      { name: "Indigo / 32", sku: "JEAN-IND-32", price: "79.00", stock: 14 },
      { name: "Indigo / 34", sku: "JEAN-IND-34", price: "79.00", stock: 9 },
    ],
  },
  {
    name: "Canvas Sneakers",
    slug: "canvas-sneakers",
    description: "Low-top canvas sneakers with a vulcanized rubber sole.",
    imageUrl: "/products/canvas-sneakers.svg",
    variants: [
      { name: "White / 8", sku: "SHOE-WHT-8", price: "55.00", stock: 10 },
      { name: "White / 9", sku: "SHOE-WHT-9", price: "55.00", stock: 11 },
      { name: "White / 10", sku: "SHOE-WHT-10", price: "55.00", stock: 7 },
    ],
  },
  {
    name: "Wool Beanie",
    slug: "wool-beanie",
    description: "Rib-knit merino wool beanie for cold mornings.",
    imageUrl: "/products/wool-beanie.svg",
    variants: [
      { name: "Black / One Size", sku: "BEAN-BLK-OS", price: "32.00", stock: 25 },
      { name: "Grey / One Size", sku: "BEAN-GRY-OS", price: "32.00", stock: 22 },
    ],
  },
  {
    name: "Leather Belt",
    slug: "leather-belt",
    description: "Full-grain leather belt with a matte brass buckle.",
    imageUrl: "/products/leather-belt.svg",
    variants: [
      { name: "Brown / M", sku: "BELT-BRN-M", price: "45.00", stock: 16 },
      { name: "Brown / L", sku: "BELT-BRN-L", price: "45.00", stock: 13 },
    ],
  },
  {
    name: "Linen Shirt",
    slug: "linen-shirt",
    description: "Breathable linen shirt with a camp collar.",
    imageUrl: "/products/linen-shirt.svg",
    variants: [
      { name: "Sky / S", sku: "SHIRT-SKY-S", price: "59.00", stock: 9 },
      { name: "Sky / M", sku: "SHIRT-SKY-M", price: "59.00", stock: 12 },
      { name: "Sky / L", sku: "SHIRT-SKY-L", price: "59.00", stock: 8 },
    ],
  },
  {
    name: "Athletic Shorts",
    slug: "athletic-shorts",
    description: "Lightweight training shorts with a zip back pocket.",
    imageUrl: "/products/athletic-shorts.svg",
    variants: [
      { name: "Navy / S", sku: "SHORT-NVY-S", price: "38.00", stock: 21 },
      { name: "Navy / M", sku: "SHORT-NVY-M", price: "38.00", stock: 24 },
      { name: "Navy / L", sku: "SHORT-NVY-L", price: "38.00", stock: 17 },
    ],
  },
];

async function seed() {
  let productCount = 0;
  let variantCount = 0;

  for (const seedProduct of seedProducts) {
    await db
      .insert(products)
      .values({
        name: seedProduct.name,
        slug: seedProduct.slug,
        description: seedProduct.description,
        imageUrl: seedProduct.imageUrl,
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: seedProduct.name,
          description: seedProduct.description,
          imageUrl: seedProduct.imageUrl,
        },
      });

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, seedProduct.slug));

    if (!product) {
      throw new Error(`Failed to seed product: ${seedProduct.slug}`);
    }
    productCount += 1;

    for (const variant of seedProduct.variants) {
      const upserted = await db
        .insert(productVariants)
        .values({ ...variant, productId: product.id })
        .onConflictDoUpdate({
          target: productVariants.sku,
          set: {
            name: variant.name,
            price: variant.price,
            stock: variant.stock,
          },
        })
        .returning({ id: productVariants.id });

      variantCount += upserted.length;
    }
  }

  console.log(
    `Seed complete: ${productCount} products processed, ${variantCount} variants upserted.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
