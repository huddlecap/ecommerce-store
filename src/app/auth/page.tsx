import { Suspense } from "react";
import AuthForm from "@/app/auth/form";

function AuthSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-zinc-500">Loading session…</p>
    </div>
  );
}

async function AuthCard({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl = "/cart" } = await searchParams;

  return (
    <div className="w-full max-w-md rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <AuthForm callbackUrl={callbackUrl} />
    </div>
  );
}

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <Suspense fallback={<AuthSkeleton />}>
        <AuthCard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
