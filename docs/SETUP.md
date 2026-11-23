# Setup

How to run the Marketplace locally and deploy it. For an overview, see the [README](../README.md).

## Prerequisites

- **Node.js 22 or newer** (`node -v`). The Supabase client needs it, and `package.json` declares `engines.node >= 22`, which Vercel reads.
- **npm** (comes with Node).
- A free **[Supabase](https://supabase.com)** account.
- A **[Vercel](https://vercel.com)** account, only if you want to deploy.

## 1. Install

```bash
git clone <your-repo-url>
cd marketplace
npm install
```

## 2. Create the Supabase project

1. Sign in at supabase.com and create a new project. Wait for it to finish provisioning.
2. Open **SQL Editor** and choose **New query**.
3. Paste the contents of [`supabase-schema.sql`](../supabase-schema.sql) and click **Run**.

This creates:

- the `listings` and `messages` tables,
- a public Storage bucket named `listing-images`,
- indexes on `category`, `created_at` and `listing_id`,
- the `stripe_accounts` and `orders` tables for Stripe payments, and `status` and `sold_at` columns on `listings`,
- Row Level Security policies (anyone can read and create; the anon key cannot edit or delete anything except to mark an available listing sold once an order exists, and to update a Stripe account's status),
- triggers that keep `listings.updated_at` current and enforce those limits.

Run it **once**. It is not idempotent: running it again fails because the tables, bucket and policies already exist. To start over, drop the `orders`, `stripe_accounts`, `messages` and `listings` tables, delete the `listing-images` bucket and its policies, then run the file again.

**Already have a database from before payments were added?** Do not re-run `supabase-schema.sql`. Run [`supabase-payments-migration.sql`](../supabase-payments-migration.sql) instead. It adds only the payment objects and is safe to run more than once. Run it before deploying code that reads or writes them.

## 3. Add the credentials

1. In Supabase, open **Project Settings, then API**, and copy the **Project URL** and the **anon public** key.
2. Create your local env file and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   ```
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_ANON_KEY=<anon public key>
   ```

Rules for these two variables:

- **No `NEXT_PUBLIC_` prefix.** The browser never talks to Supabase. It calls this app's `/api` routes, and only the server reads the keys.
- **Never use the `service_role` key.** The app is designed around the anon key and Row Level Security.
- **Names are case-sensitive on Vercel.** Use exactly `SUPABASE_URL` and `SUPABASE_ANON_KEY` (a lowercase `key` works on Windows but not on Vercel).
- `.env.local` is gitignored. Do not commit it.

Environment variables load at startup, so restart `npm run dev` after changing them.

### Stripe (payments)

Payments run in Stripe's sandbox (test mode). Add these to `.env.local` (see `.env.example`):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-only. Never prefix them with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is the one variable meant for the browser.
- Never commit a real key. `.env.local` is gitignored, and `.env.example` holds placeholders only.
- Without these variables the app still builds and runs; payment routes answer `503` until they are set.
- `STRIPE_WEBHOOK_SECRET` only exists after the webhook endpoint is registered, so leave it for later.

## 4. Run it

```bash
npm run dev
```

Open http://localhost:3000. You should see the home page. Create a listing from **Create new listing** in the sidebar, then open it and send a message.

To try the production build locally:

```bash
npm run build
npm run start
```

## 5. Test the API (optional)

With the server running on port 3000:

```bash
# List listings (empty database returns {"listings":[]})
curl http://localhost:3000/api/listings

# Create a listing
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -d '{"title":"Bike 24 inch","description":"Lightly used.","price":99,"category":"sporting-goods","seller_name":"Wei Gu","seller_email":"wei.gu@example.com"}'

# Upload a photo (returns a public url you can pass as image_url)
curl -X POST http://localhost:3000/api/upload -F "file=@photo.jpg"

# Leave a message (use the listing id from the create response)
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"listing_id":"<id>","buyer_email":"buyer@example.com","message":"I want to buy your bike!"}'

curl "http://localhost:3000/api/messages?listing_id=<id>"
```

On Windows PowerShell, use `curl.exe` instead of `curl`. The full list of routes, fields and status codes is in [FEATURES.md](FEATURES.md#api-reference).

## 6. Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New, then Project**, and import the repository. The Next.js settings are detected automatically.
3. Under **Environment Variables**, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (exact names) for all environments. For payments, also add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. Deploy.
5. Smoke test the live URL: open the home page, create a listing with a photo, open it, and send a message. Check the new rows in the Supabase **Table Editor**.

Notes for Vercel:

- If you add or change the variables after a deploy, **redeploy** so they take effect.
- Photos are limited to **4 MB** because Vercel Functions reject request bodies over about 4.5 MB.
- The listing and detail API responses are cached at the CDN for a short time (15 and 60 seconds), so a brand-new listing can take up to about 15 seconds to appear in a cached grid.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Pages say **"The database isn't set up yet"**, or `/api/...` returns `503` | `SUPABASE_URL` or `SUPABASE_ANON_KEY` is missing or misspelled. Check `.env.local` (or Vercel's variables) and restart or redeploy. |
| `/api/...` returns `500` with `Something went wrong` | Check the server log for the real error. Usual causes: the schema was not run, or the URL or key is wrong. |
| Creating a listing fails on the photo | The file must be a JPEG, PNG, WebP or GIF of 4 MB or less. The file's contents are checked, not its name. |
| The page looks unstyled or out of date in dev | A stale dev server. Stop it and run `npm run dev` again. |
| `next build` fails with an error about `.next/dev/types` | Leftover types from a dead dev server. Delete the `.next` folder and build again. |
| An occasional `fetch failed` 500 on the first request | A transient network error between the server and Supabase. The app shows a retry notice; try again. |
| Supabase says a table, policy or bucket already exists | You ran `supabase-schema.sql` twice. See the reset steps in section 2. |

## Cleaning up test data

If you created test listings, remove them in Supabase: in the **SQL Editor** run `DELETE FROM listings WHERE title LIKE '[TEST]%';` (messages are removed with their listing), and delete unused photos in **Storage, then `listing-images`**.
