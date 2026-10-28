import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "./admin-nav";

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-8 md:py-10">
      <aside className="md:w-56 md:shrink-0">
        <div className="rounded-2xl border border-black/[.08] p-3 dark:border-white/[.12] md:p-4">
          <div className="px-2 pb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Admin
            </p>
            <p className="mt-1 truncate text-sm font-medium">
              {session.user.name}
            </p>
          </div>
          <AdminNav />
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
