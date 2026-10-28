"use client";

import { useState, useTransition } from "react";
import { addToCart } from "@/actions/cart";

type Status = "idle" | "added" | "error";

export function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>("idle");

  function handleClick() {
    setStatus("idle");
    startTransition(async () => {
      try {
        await addToCart(productId, 1);
        setStatus("added");
      } catch {
        setStatus("error");
      }
    });
  }

  const label = isPending
    ? "Adding…"
    : status === "added"
      ? "Added to cart"
      : status === "error"
        ? "Try again"
        : "Add to cart";

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {label}
      </button>
      {status === "error" && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          Could not add to cart. Please try again.
        </p>
      )}
    </div>
  );
}
