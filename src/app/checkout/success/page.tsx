import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-2xl font-bold">
          ✓
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Thank you for your order</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Your order has been placed successfully and is being processed.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
