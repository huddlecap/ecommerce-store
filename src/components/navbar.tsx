"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function Navbar() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
  }

  if (isPending) {
    return null;
  }

  return (
    <nav className="border-b border-black/[.08] bg-white/80 backdrop-blur dark:border-white/[.2] dark:bg-black/80 sticky top-0 z-40">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Store
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
          >
            Cart
          </Link>
          {session ? (
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400 dark:hover:text-white"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg border border-black/[.12] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.08]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
