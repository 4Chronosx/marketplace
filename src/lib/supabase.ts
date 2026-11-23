import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const LISTING_IMAGES_BUCKET = "listing-images";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
    this.name = "SupabaseNotConfiguredError";
  }
}

let client: SupabaseClient | null = null;

// Server-only: the credentials have no NEXT_PUBLIC_ prefix, so browsers never
// see them and talk to our API routes instead. The client is created lazily so
// the app builds and runs without keys (routes answer 503 until configured).
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new SupabaseNotConfiguredError();

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Public URL prefix of the listing images bucket, or null when not configured. */
export function listingImageUrlPrefix(): string | null {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  return `${url.replace(/\/+$/, "")}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/`;
}
