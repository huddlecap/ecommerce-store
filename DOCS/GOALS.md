# E-Commerce App Goals & Roadmap

## Phase 1: Data Layer & Auth (Tier 1)

- [x] Design the Drizzle database schema (Users, Sessions, Products, Variants, Carts, Orders, OrderItems).
- [ ] **CURRENT TASK:** Create the database client (`src/db/index.ts`) to connect Next.js to Neon.
- [ ] Implement hand-rolled session authentication.

## Phase 2: Catalog & Cart (Tier 2 & 3)

- [ ] Build the product listing, filtering, and detail pages.
- [ ] Implement the cart logic (guest to authenticated merging, server-side cart calculation).

## Phase 3: Checkout & Payments (Tier 1)

- [ ] Implement the stock reservation system (critical for concurrency).
- [ ] Integrate Stripe Checkout.
- [ ] Build the Stripe Webhook handler (idempotency, verifying signatures, state transitions).

## Phase 4: Admin & Post-Purchase (Tier 2)

- [ ] Admin CRUD operations and Cloudinary integration.
- [ ] Resend email triggers.

## Phase 5: Testing & Hardening (Tier 1 Focus)

- [ ] Write the concurrency tests for stock.
- [ ] Write the webhook replay tests.
