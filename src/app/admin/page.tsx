import { requireAdmin } from "@/lib/admin";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Store overview and admin tools.
      </p>
    </div>
  );
}
