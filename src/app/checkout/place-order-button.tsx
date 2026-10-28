"use client";

import { useEffect, useActionState } from "react";
import { checkout } from "@/actions/checkout";

export function PlaceOrderButton() {
  const [state, formAction, isPending] = useActionState(checkout, {
    error: null,
  });
  const isStockError = state.error?.startsWith("Not enough stock");
  const isRedirecting = Boolean(state.url);

  useEffect(() => {
    if (state.url) {
      window.location.href = state.url;
    }
  }, [state.url]);

  return (
    <form action={formAction} className="mt-6">
      {state.error && (
        <div
          role="alert"
          className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          <p className="font-medium">
            {isStockError
              ? "Stock changed while you were checking out"
              : "Could not place your order"}
          </p>
          <p className="mt-1">{state.error}</p>
          {isStockError && (
            <a href="/cart" className="mt-2 inline-block font-medium underline">
              Update your cart
            </a>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={isPending || isRedirecting}
        className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
      >
        {isRedirecting
          ? "Redirecting to Stripe…"
          : isPending
            ? "Placing order…"
            : "Place order"}
      </button>
    </form>
  );
}
