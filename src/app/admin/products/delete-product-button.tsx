"use client";

import { useState, useTransition } from "react";
import { deleteProduct } from "@/actions/products";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`Delete "${productName}" and all its variants?`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await deleteProduct(productId);
      } catch {
        setError("Could not delete product.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <p
          role="alert"
          className="mt-1 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
