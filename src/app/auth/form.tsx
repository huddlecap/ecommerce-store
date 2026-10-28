"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { mergeCart } from "@/actions/cart";

type Mode = "sign-in" | "sign-up";

type AuthFormProps = {
  callbackUrl: string;
};

export default function AuthForm({ callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [mode, setMode] = useState<Mode>("sign-up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });

    if (result.error) {
      setSubmitting(false);
      setError(result.error.message ?? "Something went wrong");
      return;
    }

    setPassword("");

    try {
      await mergeCart();
      router.replace(callbackUrl);
    } catch {
      setSubmitting(false);
      setError(
        "You're signed in, but we couldn't merge your cart. Please try again.",
      );
      await refetch();
    }
  }

  async function handleSignOut() {
    setError(null);
    setMessage(null);
    await authClient.signOut();
    await refetch();
  }

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">Loading session…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">Auth test</h1>

        {session ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
              <p className="font-medium">{session.user.name}</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                {session.user.email}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Verified: {String(session.user.emailVerified)}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg border border-black/[.12] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.08]"
            >
              Sign out
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
              {(["sign-up", "sign-in"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    setError(null);
                    setMessage(null);
                  }}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    mode === value
                      ? "bg-white shadow-sm dark:bg-zinc-800"
                      : "text-zinc-500"
                  }`}
                >
                  {value === "sign-up" ? "Sign up" : "Sign in"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "sign-up" && (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Name</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/[.2]"
                  />
                </label>
              )}

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/[.2]"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/[.2]"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting
                  ? "Working…"
                  : mode === "sign-up"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
