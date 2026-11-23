# Marketplace

A Facebook Marketplace-style classifieds site. Visitors can post a listing with a photo, browse and search listings by category, open a listing, and send the seller a message. No login is needed.

Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4** and **Supabase** (Postgres + Storage), and designed to deploy on **Vercel**.

## What it does

| | |
|---|---|
| **Create a listing** | Photo, title, price, category, your name, email and description, with a live preview. Saved in Supabase. |
| **Browse and search** | Home page grid, a page per category (19 categories), and keyword search by title or description. |
| **Listing page** | Photo, price, description, seller details and when it was listed. |
| **Message Seller** | A buyer's email and message are saved in Supabase. (Sending a real email is not included.) |

See [docs/FEATURES.md](docs/FEATURES.md) for the details, rules and limits.

## Quick start

You need Node.js 22 or newer and a free [Supabase](https://supabase.com) project.

```bash
npm install
cp .env.example .env.local      # then fill in the two Supabase values
npm run dev
```

Open http://localhost:3000. Before the first run, create the database tables once by running [`supabase-schema.sql`](supabase-schema.sql) in the Supabase SQL editor. Without the credentials the site still builds and runs, but the API answers `503` and the pages show "The database isn't set up yet".

Step-by-step instructions, including deploying to Vercel, are in [docs/SETUP.md](docs/SETUP.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Tech stack

- **Next.js 16** App Router with Cache Components, **React 19**, **TypeScript**
- **Tailwind CSS 4** and [shadcn/ui](https://ui.shadcn.com) components (Base UI), Geist fonts, lucide icons
- **Supabase**: Postgres for listings and messages, Storage for photos, accessed only from the server with the public (anon) key and Row Level Security
- **Vercel** for hosting

## Project structure

```
src/
  app/            Pages, route groups and the /api route handlers
  components/     layout/ (header, sidebar), marketplace/ (features), ui/ (shadcn)
  lib/            Database, validation, API client and shared helpers
supabase-schema.sql   Tables, storage bucket, indexes and security policies
docs/                 Project documentation
```

## Documentation

- [docs/SETUP.md](docs/SETUP.md): detailed setup, environment variables, deployment and troubleshooting
- [docs/FEATURES.md](docs/FEATURES.md): features, validation rules, limits and the API reference
- [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md): how the code is organised and why, with notes for contributors
- [docs/step-by-step-guide.md](docs/step-by-step-guide.md): the build plan this project followed
- [docs/PROJECT.md](docs/PROJECT.md): the original brief
