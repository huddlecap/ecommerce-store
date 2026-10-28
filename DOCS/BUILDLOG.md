**Phase 1: Data Layer & Auth**

- scafold the project
- design the schema in src/db/schema.ts
- set up .env file and connect the neon db url
- set up db client in src/db/index.ts so that app can talk to db
- choose better-auth over auth.js
- installed packages for better-auth and its drizzle adapter
- set up auth secret for better-auth
- initialise the auth server file
- create API route handler
- create auth client file
- update src/db/schema.ts file for better-auth
- create src/app/auth/page.tsx with this basic testing UI

**Phase 2: Product Catalog & Seeding**

- create a Database Seeder in src/db/seed.ts
- add a seed command "npm run db:seed"
- build the Storefront UI and ran the seed command to populate

**Phase 3: The Guest-First Cart System**

Cookie & Cart Initialization Logic

- design the schema for carts and cart_items in src/db/schema.ts
- create cart initialization logic in src/actions/cart.ts
- implement guest cart identification using a cartId cookie
- implement cart creation and cookie initialization for new guests
- integrate Better Auth session detection to associate authenticated users with their carts

Add to Cart Action

- implement the addToCart(productId, quantity) server action
- implement cart item quantity updates and insertion logic

Wire Up the UI

- connect the storefront product grid to the add-to-cart action
- build the cart page in src/app/cart/page.tsx
- display cart items, quantities, and subtotal
- verify guest cart persistence and authenticated cart association

**Phase 4: Cart Merge**

Cart Merge Logic

- implement mergeCart() in src/actions/cart.ts
- merge guest carts into existing user carts, combining duplicate item quantities
- handle cart ownership validation and cookie updates
- revalidate /cart after a successful merge

Authentication Integration

- trigger mergeCart() after successful sign-in/sign-up in src/app/auth/page.tsx
- redirect to /cart after a successful merge
- handle merge failures and refresh the authentication session

**Phase 5: Checkout Flow**

Checkout Server Action

- implement checkout() in src/actions/checkout.ts
- validate the active cart and calculate totals server-side
- create orders and order item snapshots in an atomic database transaction
- clear the cart and cartId cookie after successful checkout
- revalidate / and /cart
- resolve Neon transaction support using neon-serverless Pool
- verify order totals, order items, cart deletion, and cookie cleanup end-to-end

Build the checkout UI & Order confirmation

- build the checkout page with cart summary and item totals
- implement the place-order button with loading state and success redirect
- create the order confirmation page at src/app/order/[id]/page.tsx
- connect the cart page to /checkout
- verify production build and TypeScript checks pass

Build the Success Page

- create the success confirmation page at src/app/checkout/success/page.tsx
- display a "Thank you for your order" confirmation message
- provide a "Continue Shopping" button routing back to the homepage
- update place-order button to redirect to /checkout/success upon completion

Auth & Navigation

- force redirect guest users from /checkout to /auth?callbackUrl=/checkout
- redirect back to /checkout after successful sign-in/sign-up
- build global Navbar in src/components/navbar.tsx with Home, Cart, Sign in/Sign out

- verified the checkout flow behaviour
- verified the checkout flow as a guest user

**Phase 6: Stock Reservation System(Concurrency)**

- set product_variants.stock default to 10 in schema and seed
- baseline Drizzle migrations and apply the stock default migration
- lock variant rows with SELECT ... FOR UPDATE in checkout
- validate and decrement stock inside the checkout transaction
- surface "Not enough stock" errors on the checkout page
- verify concurrent checkouts cannot oversell

**Phase 7: Stripe Payment Integration**

Setup

- install `stripe` and create `src/lib/stripe.ts`
- document Stripe env vars in `.env.example`

Checkout Action

- create the Checkout Session inside the checkout transaction
- map cart items to `line_items` in cents with `orderId`/`cartId` metadata
- set success/cancel URLs and return `session.url`
- keep the cart until the webhook confirms payment

Client Redirect

- store the session URL and redirect with `window.location.href`
- show "Redirecting to Stripe…" during redirect

**Phase 8: Stripe Webhooks**

- add the signed endpoint at `src/app/api/webhooks/stripe/route.ts`
- completed: mark the order paid and delete the cart
- expired: cancel the order and restore variant stock
- lock the order row; verified duplicate deliveries do not double-restore

**Phase 9: Transactional Emails**

- install Resend, `@react-email/components`, and `@react-email/render`
- add the lazy client in `src/lib/resend.ts`
- build the receipt template in `src/emails/ReceiptEmail.tsx`
- send the receipt from `checkout.session.completed` with an idempotency key
- verified the send path with Resend's test recipient
- verified the Resend API key
- customer delivery requires a verified `RESEND_FROM_EMAIL` domain

**Phase 10: Admin Dashboard & RBAC**

Database & Auth Authorization

- default `user.role` to `user` and expose it through Better Auth additional fields
- add migration `0002_user_role_default` and normalize existing roles
- add `requireAdmin()` and guard the `/admin` layout and page
- verify anonymous and non-admin users redirect to `/`; admins see the dashboard

Admin Navigation

- add the admin shell with Dashboard and Orders navigation
- add the guarded `/admin/orders` route

Orders Viewer

- join orders with users and order items, aggregating item counts
- sort by `createdAt` descending and render order ID, date, customer, total, and payment status
- add status badges and an empty state
- verified the query and table with paid, pending, and cancelled test orders

**Phase 11: Admin Product CRUD **

Cloudinary Setup

- install `next-cloudinary`
- document the Cloudinary public and secret env vars in `.env.example`
- add the admin-only `/api/cloudinary/signature` endpoint for signed widget uploads

Product Actions

- add `createProduct`, `updateProduct`, and `deleteProduct` with `requireAdmin()`
- create and update products with their variants transactionally
- sync the submitted variant set when provided; an empty list clears variants
- hard-delete products and their variants
- revalidate `/admin/products` and `/` after each mutation
- verified non-admin rejection and the admin create/update/delete flow

Product Admin List

- add `/admin/products` with product/variant rows showing image, name, SKU, price, and stock
- add Add New, Edit, and Delete controls; Delete calls `deleteProduct`
- add Products to the admin navigation
- verified admin rendering and non-admin blocking

Product Forms & Upload

- add `/admin/products/new` and `/admin/products/[id]` with React Hook Form and Zod
- use a shared form for product details, variants, image preview, and auto-generated slugs
- add and remove variants with per-field validation
- upload product images with `CldUploadWidget` and store the returned `secure_url` in form state
- wire create and update to the product server actions and return to `/admin/products`
- verified admin form rendering, product creation, edit prefill, and the signed upload endpoint

**Phase 12: Testing & Hardening**

Concurrency Test

- add `scripts/test-concurrency.ts` simulating concurrent `checkout()` calls via `Promise.all` for a single-stock variant
- assert exactly one transaction succeeds and the rest fail with "Not enough stock"
- proves `SELECT ... FOR UPDATE` row-level lock prevents overselling

Webhook Replay Test

- add `scripts/test-webhook-replay.ts` simulating duplicate Stripe `checkout.session.expired` webhooks
- construct mock Stripe event payloads with valid test signatures via `stripe.webhooks.generateTestHeaderString`
- fire the expired payload twice against `/api/webhooks/stripe`
- assert stock restored exactly once (order row lock prevents double restoration)

Production Build

- run `npm run build` successfully
- TypeScript checks pass and all pages generate

- verified Phase 5: Testing & Hardening complete
