import { requireAdmin } from "@/lib/admin";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  await requireAdmin();

  return <ProductForm />;
}
