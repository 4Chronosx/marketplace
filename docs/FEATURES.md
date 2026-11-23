# Features

What the Marketplace does, the rules it enforces, and its API. To run it, see [SETUP.md](SETUP.md).

- [Create a listing](#create-a-listing)
- [Browse, filter and search](#browse-filter-and-search)
- [Listing page](#listing-page)
- [Message the seller](#message-the-seller)
- [Get paid with Stripe](#get-paid-with-stripe)
- [Buy Now](#buy-now)
- [Payment confirmation](#payment-confirmation)
- [Layout and navigation](#layout-and-navigation)
- [Limits at a glance](#limits-at-a-glance)
- [API reference](#api-reference)
- [Not included](#not-included)

There is no login. Anyone can create listings and send messages.

## Create a listing

Reached from **Create new listing** in the sidebar, then **Item for sale** (`/create/item`). The other listing types on `/create` (multiple listings, vehicle, home) are shown as "Coming soon".

| Field | Rule |
|---|---|
| Photo | Optional, one image. JPEG, PNG, WebP or GIF, up to 4 MB. Drag and drop or click to browse. Picking another photo replaces the first. |
| Title | Required, up to 100 characters. |
| Price | Required, 0 to 10,000,000, at most 2 decimal places. `0` shows as "Free". Only digits and one decimal point are accepted while typing. |
| Category | Required, one of the 19 categories. |
| Your name | Required, up to 100 characters. |
| Email | Required, a valid address. Buyers see it on the listing page. |
| Description | Required, up to 1,000 characters. |

Behaviour:

- A **live preview** beside the form shows the listing as buyers will see it.
- Fields are checked in the browser first, and again on the server with the same rules. The first invalid field gets focus and every error is announced to screen readers.
- The photo is uploaded first, then the listing is saved with the photo's address. If saving fails and you retry, the photo is **not uploaded again**.
- Errors the server reports (for example a field it rejects) are shown next to the matching field.
- On success you see "Your listing is live" with **View listing**, **Back to Marketplace** and **Create another**.
- The server checks the photo's actual bytes, so a renamed non-image file is rejected.

Listings are created with the default location **Palo Alto, CA**.

## Browse, filter and search

- **Home** (`/`) shows "Today's picks": the newest listings first, up to 100.
- **Categories** (`/category/<slug>`) show only that category. The category list is in the sidebar on desktop and in a slide-out menu on mobile.
- **Search** is a box on the home and category pages. It matches the **title or description** (case-insensitive) and keeps you on the same page; the search is kept in the URL (`?q=...`), so it can be shared and survives a refresh. On a category page it searches within the category.
- Search text is cleaned on the server (characters that have a special meaning in the database filter are dropped) and limited to 100 characters.
- The grid is 1 column on phones, then 2, 3, 4 and 5 as the screen widens.

Every state is handled:

| State | What you see |
|---|---|
| Loading | Skeleton cards ("Loading listings..." for screen readers) |
| No listings yet | "No listings yet" (or "No listings in <category> yet") with a **Create new listing** button |
| No search match | "No listings match your search" with **Clear search** |
| Error | A message with **Try again**; "The database isn't set up yet" if Supabase is not configured |

## Listing page

`/item/<id>` shows the photo (or a placeholder), price, title, when it was listed ("5 minutes ago"), location, description, the seller's name and email, and the message form. There is a **Back to <category>** link.

- An id that is not a valid UUID, or a listing that does not exist, shows "Listing not found" with a way back home. A malformed id never calls the server.
- Long titles and descriptions wrap instead of overflowing.

## Message the seller

The form on the listing page asks for **your email** (required) and a **message** (required, up to 1,000 characters).

- The message is saved in the `messages` table with the buyer's email, the message, and the **seller's email taken from the listing** by the server. A request cannot supply or change the seller's email.
- Success shows "Message sent to <seller name>." and clears the form.
- Errors appear next to the field. A listing that was removed in the meantime, or a database that is not configured, gets its own message.
- Sending a real email to the seller is **not** part of this version; messages are only stored.

## Get paid with Stripe

Sellers connect a Stripe account (test mode) so buyers can pay them. Reached from **Connect with Stripe** in the sidebar, or the link at the bottom of `/create`.

- Enter the email you use on your listings at `/connect`. There is no login, so the email is how a seller is identified.
- The server creates a Stripe Standard account for that email (or reuses the one already saved) and sends you to Stripe's hosted onboarding. The account id is saved in `stripe_accounts`, keyed by the lowercased email. The same email never gets two accounts.
- When you finish or leave Stripe you land on `/connect/return`, which checks your status with Stripe: **connected**, **not finished** (with a **Continue with Stripe** button), or a not-found message for an unknown account.
- If an onboarding link expires, Stripe returns you through `/api/connect/refresh`, which makes a fresh link.
- An email whose Stripe account can already take payments is never given a new link, so entering someone else's email cannot reopen their onboarding. An account that submitted its details but still owes Stripe something (for example an ID number) is not finished: it gets a fresh link so the seller can complete it.
- Without Stripe configured, `/connect` shows "Payments can't be set up right now" and the API answers `503`.

## Buy Now

The listing page shows a **Buy Now** button under the price when the item can be bought, and a short reason when it can't.

| Situation | What the page shows |
|---|---|
| Seller has connected Stripe | **Buy Now** |
| Seller has not connected Stripe | "This seller hasn't set up online payments yet" (the message form is still there) |
| Item already sold | "This item has been sold." |
| Price under $0.50 (including Free) or over $999,999.99 | "This item can't be bought online." |

- **Buy Now** opens Stripe Checkout for the listing's title and price. After paying, the buyer returns to `/order/success`; cancelling returns to the listing.
- The payment is a **direct charge** on the seller's connected account. The marketplace keeps a **10% application fee** (`PLATFORM_FEE_RATE` in `src/lib/payments.ts`); the seller receives the rest, minus Stripe's own fees.
- The server decides whether an item can be bought, not the page. It reads the price from the database (the request only carries the listing id), refuses a sold listing or an unconnected seller, and asks Stripe whether the seller's account can take payments yet. A seller who started onboarding but never finished is refused with "hasn't finished setting up payments".

## Payment confirmation

Stripe tells the marketplace when a payment goes through by calling `POST /api/stripe/webhook`. That call, not the buyer's browser, is what makes a purchase official.

- Every call is checked against Stripe's signature (`STRIPE_WEBHOOK_SECRET`). A missing or wrong signature is rejected with `400`.
- For a paid session on a listing whose seller is one of ours, it saves **one order** (amount, the fee Stripe actually took, buyer email, Stripe ids) and marks the listing **Sold**.
- Stripe may deliver an event more than once. A repeat never creates a second order.
- The test sandbox is shared with other apps, so the endpoint also receives events that aren't ours: unknown accounts, unknown listings, unpaid sessions and other event types. All of these are ignored and answered `200`.
- If two buyers pay for the same listing, both orders are recorded and a warning is logged so the second payment can be refunded by hand.

## Layout and navigation

- A header with the brand. On desktop a sidebar holds **Create new listing** and the category list; on mobile the sidebar becomes a slide-out menu.
- The create and listing pages use a plain header only, so they are not cluttered by the category list.
- Facebook blue (`#1877f2`) is the accent colour. The layout follows the mockups in `docs/mockups`.
- Keyboard and screen reader support: visible focus rings, labelled controls, live regions for status and errors, and reduced-motion support for hover effects.
- Error pages: a friendly "something went wrong" screen with a retry for unexpected errors, and a "page not found" screen.

## Limits at a glance

| Item | Limit |
|---|---|
| Photo | 1 per listing, 4 MB, JPEG / PNG / WebP / GIF |
| Title, seller name | 100 characters |
| Description, message | 1,000 characters |
| Price | 0 to 10,000,000, 2 decimals |
| Search text | 100 characters |
| Listings per request | 100 maximum (the site asks for 100; the API default is 50) |
| Browser request timeout | 20 seconds (60 for photo uploads) |

## API reference

All routes return JSON. Errors always have the same shape:

```json
{ "error": { "message": "Invalid listing.", "fields": { "title": "Enter a title." } } }
```

`fields` is present only for validation errors. Common statuses: `400` invalid input, `404` not found, `413` photo too large, `415` not an image, `502` Stripe could not complete the request, `503` database or Stripe not configured, `500` unexpected error (logged on the server, never leaked).

### `GET /api/listings`

Returns listing summaries, newest first, for the grid.

| Query | Meaning |
|---|---|
| `category` | A category slug. Unknown slugs return `400`. |
| `q` | Search text (title or description). |
| `limit` | 1 to 100, default 50. |
| `offset` | 0 to 100000, default 0. |

```json
{ "listings": [{ "id": "…", "title": "Bike 24 inch", "price": 99, "category": "sporting-goods", "location": "Palo Alto, CA", "image_url": null, "created_at": "2026-01-01T12:00:00+00:00" }] }
```

The response is cached at the CDN for 15 seconds (`s-maxage=15, stale-while-revalidate=60`). Summaries leave out the description and the seller's email.

### `POST /api/listings`

Creates a listing. Returns `201 { "listing": { … } }` with every field.

```json
{ "title": "Bike 24 inch", "description": "Lightly used.", "price": 99, "category": "sporting-goods", "seller_name": "Wei Gu", "seller_email": "wei.gu@example.com", "image_url": null }
```

`image_url` is optional and must be a URL returned by `POST /api/upload` (anything else is rejected). `price` must be a number.

### `GET /api/listings/[id]`

Returns `{ "listing": { … } }` with all fields, including `description`, `seller_name`, `seller_email` and `status` (`available` or `sold`), plus `buy_status`: `ready`, `sold`, `no_seller_account` or `price_unsupported`. A malformed or unknown id returns `404`. Cached for 10 seconds (`s-maxage=10, stale-while-revalidate=30`), kept short because `buy_status` says whether the item can be bought right now.

### `POST /api/upload`

`multipart/form-data` with one image in the `file` field. Returns `201 { "url": "…", "path": "…" }`.

| Status | When |
|---|---|
| `400` | No file, or not multipart |
| `413` | Larger than 4 MB |
| `415` | Not a JPEG, PNG, WebP or GIF (checked from the file's bytes) |

### `POST /api/messages`

```json
{ "listing_id": "<uuid>", "buyer_email": "buyer@example.com", "message": "I want to buy your bike!" }
```

Returns `201 { "message": { … } }`. The seller's email is filled in from the listing. An unknown listing returns `404`.

### `GET /api/messages?listing_id=<uuid>`

Returns `{ "messages": [ … ] }`, newest first. Note that messages, including both email addresses, are readable by anyone who knows a listing id, as the schema's policies specify.

### `POST /api/connect`

```json
{ "seller_email": "wei.gu@example.com" }
```

Creates (or reuses) the seller's Stripe account and returns `{ "url": "https://connect.stripe.com/…" }` to send them to Stripe's onboarding. If that email's account can already take payments it returns `{ "connected": true }` instead. An invalid email returns `400`, Stripe failures `502`, missing configuration `503`.

### `GET /api/connect/refresh?account=acct_…`

Stripe's refresh URL. Redirects (`302`) to a fresh onboarding link for an account saved by this app. Anything else, or any failure, redirects to `/connect?error=refresh`.

### `POST /api/checkout`

```json
{ "listing_id": "<uuid>" }
```

Returns `{ "url": "https://checkout.stripe.com/…" }`, the Stripe Checkout page for that listing. The price comes from the database. Statuses: `400` invalid id, `404` unknown listing, `409` the listing can't be bought (sold, seller not connected or not finished onboarding, price Stripe can't charge), `502` Stripe failed, `503` Stripe or the database not configured.

### `POST /api/stripe/webhook`

Called by Stripe, not by the site. Needs the `Stripe-Signature` header and the raw JSON body Stripe sent. Answers `200 { "received": true }` for any verified event (acted on or ignored), `400` for a missing or invalid signature, `503` if `STRIPE_WEBHOOK_SECRET` isn't set, and `5xx` if saving fails (Stripe then retries).

### Data model

`listings`: `id`, `title`, `description`, `price`, `category` (slug), `seller_name`, `seller_email`, `image_url`, `location`, `status`, `sold_at`, `created_at`, `updated_at`.
`messages`: `id`, `listing_id` (deleted with its listing), `buyer_email`, `seller_email`, `message`, `created_at`.
`stripe_accounts`: `id`, `seller_email` (lowercase, unique), `stripe_account_id` (unique), `details_submitted`, `charges_enabled`, `created_at`, `updated_at`. Also `orders`; see [SCHEMA.md](SCHEMA.md#payments-stripe-connect).
Photos live in the public Storage bucket `listing-images`. The full SQL is in [`supabase-schema.sql`](../supabase-schema.sql).

## Not included

- Login, accounts, or editing and deleting listings (the database blocks edits and deletes made with the public key).
- Sending real emails; messages are stored only.
- More than one photo per listing, vehicle and home listing types, and bulk upload.
- Pagination or infinite scroll (the grid shows up to 100 listings).
- Full-text or fuzzy search (search is a simple "contains" match).
- Location search (every listing uses Palo Alto, CA).
