# Development guide

How the code is organised and why, for anyone changing it. To run the project, see [SETUP.md](SETUP.md). For what it does, see [FEATURES.md](FEATURES.md). The phase-by-phase plan this project followed is in [step-by-step-guide.md](step-by-step-guide.md).

> **Next.js 16 is not the Next.js most examples show.** Before writing code against a Next API, read the matching guide in `node_modules/next/dist/docs/` (the repo's `AGENTS.md` says the same). Heed deprecation notices.

## Project map

```
src/
  app/
    layout.tsx                 html, body, fonts, metadata
    globals.css                Tailwind 4 theme tokens
    not-found.tsx              404 page
    (browse)/                  pages with the sidebar and category list
      layout.tsx  page.tsx  error.tsx
      category/[slug]/page.tsx
    (focus)/                   pages with the brand header only
      layout.tsx  error.tsx
      create/page.tsx  create/item/page.tsx
      item/[id]/page.tsx
    api/
      listings/route.ts        GET (list), POST (create)
      listings/[id]/route.ts   GET (one)
      messages/route.ts        GET, POST
      upload/route.ts          POST (photo)
      connect/route.ts         POST (start Stripe onboarding)
      connect/refresh/route.ts GET (fresh onboarding link, redirects)
      checkout/route.ts        POST (open Stripe Checkout for a listing)
  components/
    layout/                    header, sidebar, mobile-nav, category-list
    marketplace/               item-grid, listing-card, item-details, create-item-form, message-form, ...
    ui/                        shadcn/ui primitives (button, input, select, sheet, ...)
  lib/
    categories.ts              the 19 categories (single source of truth)
    listing-validation.ts      limits and validation shared by browser and server
    listings.ts                Listing and ListingSummary types, formatPrice
    supabase.ts                lazy server-only Supabase client
    stripe.ts                  lazy server-only Stripe client, account and onboarding-link helpers
    connect.ts                 seller onboarding: Stripe account + saved row, status check
    payments.ts                fee rate, currency, cents math, BuyStatus (shared by browser and server)
    checkout.ts                Buy Now: can this listing be bought, then open Checkout
    db.ts                      typed database and storage queries
    api.ts                     response helpers for route handlers
    api-client.ts              browser fetch wrapper for /api
    use-api-resource.ts        data-loading hook
supabase-schema.sql            tables, bucket, indexes, policies, triggers (fresh install)
supabase-payments-migration.sql  the payment objects only, idempotent (existing database)
```

The two **route groups** in parentheses do not appear in URLs. `(browse)` wraps pages in the sidebar; `(focus)` is for flows (creating a listing, reading one) that should not show the category rail.

## How data flows

```
Browser component
   -> src/lib/api-client.ts        (fetch, timeout, error mapping)
   -> /api route handler           (src/app/api/**)
   -> src/lib/listing-validation   (validate input, shared with the forms)
   -> src/lib/db.ts                (typed Supabase queries)
   -> Supabase (Postgres + Storage)
```

- **The browser never talks to Supabase.** Credentials are server-only (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, no `NEXT_PUBLIC_`), so nothing secret ships to the client.
- **Pages fetch through the API.** Client components such as `item-grid.tsx` and `item-details.tsx` call `api-client.ts` through the `useApiResource` hook, which handles loading, errors, retry, and ignores stale responses when the search or id changes.
- **One set of rules.** `listing-validation.ts` holds the limits and `validateListing`, used by the create form and by the API (`validateNewListingPayload`). Change a limit there and both sides change.
- **Errors have one shape**: `{ "error": { "message", "fields"? } }`. `api.ts` builds it (`jsonError`) and maps thrown errors to responses (`handleRouteError`: not configured -> 503, not found or foreign-key violation -> 404, anything else -> logged and a generic 500). The browser wraps failures in `ApiRequestError` with the status and field errors.
- **Not configured is a normal state.** `getSupabase()` creates the client lazily and throws `SupabaseNotConfiguredError` when the variables are missing, so `npm run build` and the app work without credentials and routes answer `503`. Do not add placeholder keys to hide this.

## Next.js 16 conventions used here

- **Cache Components and partial prefetching** are enabled in `next.config.ts` (`cacheComponents`, `partialPrefetching`).
- **`params` and `searchParams` are Promises.** Pages read them with `await` inside a `<Suspense>` boundary. The global helpers `PageProps<"/route">`, `LayoutProps<"/">` and `RouteContext<"/api/...">` give typed access.
- **`useSearchParams` needs `<Suspense>`** (see how the pages wrap `ItemGrid` and `SearchForm`).
- **Search** is a `next/form` GET form, so the query lives in the URL.
- **Time on the client**: components that show "5 minutes ago" read the clock with `use(io())` from `next/cache`, and keep the first value with a lazy `useState(() => Date.now())`, because the React compiler lint rules forbid impure calls such as `Date.now()` during render.
- **Images** use `next/image`. Remote photos must match `images.remotePatterns` in `next.config.ts` (the Supabase public bucket path). If your Supabase host differs, update it there.
- **React 19 lint rules** (React compiler): no synchronous `setState` inside effects, no impure calls in render. `use-api-resource.ts` derives its loading state by comparing the settled key with the current key instead of setting state in the effect.

## Styling

- **Tailwind CSS 4**, configured in CSS. Theme tokens (including `--brand: #1877f2` and `--color-brand`) live in `src/app/globals.css`; the shadcn primary, ring and sidebar colours point at the brand colour.
- **shadcn/ui** style `base-vega` on Base UI primitives (`components.json`). Components accept a `render` prop where other libraries use `asChild`.
- Layout is mobile first, with a 4px spacing grid. The listing grid is 1 / 2 / 3 / 4 / 5 columns (`LISTING_GRID_CLASSNAME`). Honour `prefers-reduced-motion` for any new animation.

## Security decisions

| Decision | Why |
|---|---|
| Anon key and Row Level Security only, never `service_role` | The API is public with no login, so the database itself must be safe. Policies allow read and insert. The only anonymous updates are marking an available listing sold and updating a Stripe account's status (see the payment rows below). No deletes. |
| Payments write through the anon key, limited by RLS and triggers | Chosen over a `service_role` key or `SECURITY DEFINER` functions. A trigger lets the `anon` role change a listing only from `available` to `sold`, and only once an order exists; nothing else on the listing can change. New listings must start `available`. |
| A saved Stripe account cannot be re-pointed | A trigger rejects changes to `stripe_accounts.seller_email` and `stripe_account_id`, so nobody can redirect a seller's payouts. |
| Checkout takes only a listing id | The price, the fee and the seller's account are all read server-side, so a request cannot choose what it pays or who gets paid. |
| `orders.stripe_session_id` is unique | Stripe retries webhooks; `dbCreateOrder` treats a repeat as already recorded. |
| Credentials only on the server | Nothing secret in the browser bundle. |
| `seller_email` on a message is looked up from the listing | A caller cannot spoof who a message is for. |
| Photos are checked by magic bytes, not name or declared type | A renamed file cannot sneak in; the stored content type comes from the detected type. |
| `image_url` must start with this project's bucket URL | A listing cannot point at an arbitrary image. |
| Search text is stripped of filter metacharacters | It is interpolated into a PostgREST `or(...)` filter. |
| 500 errors are logged, never returned | No internals leak to callers. |
| The list endpoint returns summaries only | Cards do not need the description or seller email. |

Known and accepted by the schema: messages (with both emails) are publicly readable per listing id. Orders (with buyer email and amounts) and Stripe account ids are readable with the anon key too.

Known and accepted for payments: the database cannot tell a verified Stripe webhook from any other caller holding the anon key. That key is server-only (no `NEXT_PUBLIC_`), so this holds as long as it stays secret. Someone who obtained it could create an order or mark an available listing sold, which the triggers make harder but cannot prevent. If that is no longer acceptable, move the webhook's writes behind a `service_role` key used in one server module.

## Performance decisions

- **Summaries for the grid.** `dbListListings` selects only the card columns (`ListingSummary`); `dbGetListing` returns the full `Listing`.
- **CDN cache headers** on successful GETs only (`cachedJson` in `api.ts`): `s-maxage` with `stale-while-revalidate`, no `max-age`, so browsers always revalidate. Writes and errors are never cached.
- **Photos** are uploaded with a one-year `cache-control` and served through `next/image` with `sizes`.
- **Request timeouts** in `api-client.ts` stop a stalled request from leaving a loading state up forever.
- Search uses `ilike '%q%'`, which cannot use an index. That is fine at this scale; move to Postgres full-text search if the table grows large.

## Build and deploy notes

- `package.json` declares `engines.node >= 22` (needed by `@supabase/supabase-js`; Vercel reads it).
- The 4 MB photo cap (`MAX_PHOTO_BYTES`) is below Vercel's roughly 4.5 MB request body limit.
- Environment variable names are case-sensitive on Vercel.
- A stale `.next/dev/types` folder from a dead dev server can break `next build`; delete it.
- Tailwind 4 native modules are included for Linux, macOS and Windows in `package-lock.json`, so Vercel (Linux) builds from the lockfile. Use `npm ci` in CI.
- Before pushing: `npm run lint` and `npm run build` (the build also runs the type check).

## How to extend

**Add a category.** Add `{ slug, name }` to `CATEGORIES` in `src/lib/categories.ts`. The sidebar, the create form, the category pages (`generateStaticParams`) and API validation all read from it. Existing listings keep their slug.

**Add a listing field** (for example `condition`):
1. Add the column in Supabase (and to `supabase-schema.sql`).
2. Add it to `Listing` in `listings.ts` and to `LISTING_COLUMNS` and `ListingRow`/`toListing` in `db.ts`.
3. Add it to `NewListingPayload` and validate it in `listing-validation.ts` (`validateListing` and `validateNewListingPayload`).
4. Add the form field in `create-item-form.tsx` (and map the API field name in `SERVER_FIELD_NAMES` if it differs) and show it in `item-details.tsx`.
5. If cards need it, add it to `ListingSummary` and `SUMMARY_COLUMNS`.

**Add an API route.** Create `src/app/api/<name>/route.ts`, validate input with a pure function in `listing-validation.ts`, call `db.ts`, and finish with `handleRouteError`. Add a function for it in `api-client.ts`.

## Conventions

- TypeScript everywhere; avoid `any`. Shared types live in `lib/`.
- Server-only code (`supabase.ts`, `db.ts`, `api.ts`) is never imported by client components.
- Keep components small and focused; feature components live in `components/marketplace`, primitives in `components/ui`.
- Every async view handles loading, error (with retry) and empty states. See `item-grid.tsx` for the pattern.
- Every interactive element has a visible focus style and an accessible name.

## Testing

There is no automated test suite yet. The project was verified by hand against a production build (`npm run build`, then `npm run start`) covering four flows: creating a listing, browsing and searching, viewing a listing and messaging the seller, and error handling (invalid input, missing data, network failure, no credentials). Lint and the type check run as part of `npm run lint` and `npm run build`.
