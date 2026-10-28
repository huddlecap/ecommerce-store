# Project State & Memory

## Core Mission

Build a robust, production-ready e-commerce application using Next.js, Drizzle ORM, Neon (Postgres), and Better-Auth.

## Current State: Admin Product CRUD Complete; Phase 5 Next

The foundational data layer (Phase 1), commerce engine (Phase 2), and checkout flow are complete. This includes Better-Auth integration, product seeding, guest cart cookies, cart merging, atomic checkout transactions via neon-serverless, a global Navbar, forced login at checkout, guest-cart merging after sign-in, and stock concurrency control.

**Stock Concurrency phase: completed.** `product_variants.stock` is enforced with row-level `SELECT ... FOR UPDATE` locking and decremented inside the checkout transaction, so concurrent checkouts cannot oversell. Insufficient-stock errors are surfaced gracefully on the checkout page.

**Stripe Payment Integration: completed.** Checkout creates a Stripe Checkout Session and redirects the client. The webhook verifies signatures, marks orders paid and deletes the cart on `checkout.session.completed`, and cancels orders and restores variant stock on `checkout.session.expired`. The expired handler locks the order row so duplicate webhooks cannot double-restore stock.

**Transactional Emails: implemented and verified.** `src/lib/resend.ts` exposes a lazy client, `src/emails/ReceiptEmail.tsx` renders the receipt, and `checkout.session.completed` emails the customer with an idempotency key after marking the order paid. The send path is verified with Resend's test recipient; customer delivery requires a verified sender domain in `RESEND_FROM_EMAIL`.

**Admin Access Control: implemented.** `user.role` defaults to `user` (migration `0002_user_role_default`) and is exposed through Better Auth. `requireAdmin()` in `src/lib/admin.ts` validates the session and redirects non-admins. The `/admin` layout and every admin page call it; future admin Server Actions must call it close to the data. The admin shell provides Dashboard, Products, and Orders navigation via `src/app/admin/admin-nav.tsx`.

**Admin Orders Viewer: implemented.** `/admin/orders` joins orders with users and order items, aggregates item counts, sorts newest first, and renders order ID, date, customer email/name, total, and a payment-status badge. It has an empty state and is guarded by `requireAdmin()`.

**Admin Product CRUD (Phase 11): completed.** Cloudinary signed uploads are configured through the admin-only `/api/cloudinary/signature` endpoint. The shared product form uses React Hook Form + Zod for product details and variants, stores uploaded `secure_url` values in form state, and calls the admin-guarded create/update actions. `/admin/products/new` and `/admin/products/[id]` are implemented.

**Admin Products List: implemented.** `/admin/products` renders product/variant rows with image, name, SKU, price, stock, and Add New/Edit/Delete controls. Delete calls `deleteProduct`; the nav includes Products. Add New and Edit open the shared product form.

**Status:** Payments, stock reservation, abandoned-cart recovery, receipt emails, admin authorization/orders viewer, and admin product CRUD (actions, list, forms, and signed Cloudinary uploads) are implemented.

## Immediate Next Objective

**Admin order actions, then Phase 5: Testing & Hardening.** Admin product CRUD (Phase 11) is complete. Receipt emails are working; verify the sender domain for real customer delivery.

## Up Next (Returning to Original Roadmap)

**Phase 3: Checkout & Payments**

- Stock reservation system (concurrency) — completed.
- Integrate Stripe Checkout — completed.
- Build the Stripe Webhook handler — completed.

**Phase 4: Admin & Post-Purchase**

- Resend email triggers — implemented and verified with a test recipient.
- Admin authorization, navigation, and orders viewer — implemented and verified.
- Cloudinary setup, product CRUD actions, admin products list, add/edit forms with Cloudinary upload, and production build — implemented and verified.
- Admin order actions — next.

**Phase 5: Testing & Hardening**

- Concurrency and webhook replay tests.
- Test scripts: `scripts/test-concurrency.ts` and `scripts/test-webhook-replay.ts`.
- Run them against the dev server:

  ```bash
  npm run dev
  ```

  ```bash
  npx tsx scripts/test-concurrency.ts
  npx tsx scripts/test-webhook-replay.ts
  ```

Both scripts create temporary test rows and clean them up automatically.
