import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, user } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20",
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20",
  cancelled:
    "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-white/[.06] dark:text-zinc-400 dark:ring-white/10",
};

const fallbackStatusStyle =
  "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-white/[.06] dark:text-zinc-400 dark:ring-white/10";

function formatPrice(value: string) {
  return priceFormatter.format(Number(value));
}

export default async function AdminOrdersPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: orders.id,
      createdAt: orders.createdAt,
      totalAmount: orders.totalAmount,
      status: orders.status,
      customerEmail: user.email,
      customerName: user.name,
      itemCount: count(orderItems.id),
    })
    .from(orders)
    .leftJoin(user, eq(orders.userId, user.id))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .groupBy(
      orders.id,
      orders.createdAt,
      orders.totalAmount,
      orders.status,
      user.email,
      user.name,
    )
    .orderBy(desc(orders.createdAt), desc(orders.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View orders across the store.
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          {rows.length} {rows.length === 1 ? "order" : "orders"}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/[.08] dark:border-white/[.12]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/[.06] text-sm dark:divide-white/[.08]">
            <caption className="sr-only">Orders</caption>
            <thead className="bg-zinc-50 dark:bg-white/[.03]">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Order ID
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Customer Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Total Amount
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Payment Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <p className="font-medium">No orders yet</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Orders will appear here after checkout.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((order) => (
                  <tr key={order.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {order.id}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {`${order.itemCount} ${
                          order.itemCount === 1 ? "item" : "items"
                        }`}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-zinc-600 dark:text-zinc-400">
                      <time dateTime={order.createdAt.toISOString()}>
                        {dateFormatter.format(order.createdAt)}
                      </time>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">
                        {order.customerEmail ?? "Deleted user"}
                      </p>
                      {order.customerName ? (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {order.customerName}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums">
                      {formatPrice(order.totalAmount)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
                          statusStyles[order.status] ?? fallbackStatusStyle
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
