import { DatabaseError, NotFoundError } from "./db";
import { PurchaseNotAllowedError } from "./payments";
import { StripeNotConfiguredError, isStripeError } from "./stripe";
import { SupabaseNotConfiguredError } from "./supabase";

/** `{ error: { message, fields? } }` with the given HTTP status. */
export function jsonError(
  status: number,
  message: string,
  fields?: Record<string, string>,
): Response {
  return Response.json(
    { error: fields ? { message, fields } : { message } },
    { status },
  );
}

// CDN-only caching (`s-maxage`, no `max-age`): browsers always revalidate, so a
// user never sees a stale page from their own cache. Used on successful GETs only.
const CACHE_POLICIES = {
  list: "public, s-maxage=15, stale-while-revalidate=60",
  // Short: the detail response says whether the item can be bought right now.
  detail: "public, s-maxage=10, stale-while-revalidate=30",
} as const;

/** `Response.json` with a CDN cache policy. */
export function cachedJson(
  body: unknown,
  policy: keyof typeof CACHE_POLICIES,
): Response {
  return Response.json(body, {
    headers: { "Cache-Control": CACHE_POLICIES[policy] },
  });
}

/** Parses a JSON request body; returns undefined when it isn't valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Maps thrown errors to responses. Unexpected errors are logged, never leaked. */
export function handleRouteError(error: unknown): Response {
  if (error instanceof SupabaseNotConfiguredError) {
    return jsonError(503, "The database is not configured yet.");
  }
  if (error instanceof StripeNotConfiguredError) {
    return jsonError(503, "Payments are not configured yet.");
  }
  if (error instanceof NotFoundError) {
    return jsonError(404, error.message);
  }
  // The listing can't be bought right now (sold, seller not set up, ...).
  if (error instanceof PurchaseNotAllowedError) {
    return jsonError(409, error.message);
  }
  // Postgres foreign key violation: the referenced listing doesn't exist.
  if (error instanceof DatabaseError && error.code === "23503") {
    return jsonError(404, "Listing not found.");
  }
  // Stripe rejected or couldn't complete a request we made to it.
  if (isStripeError(error)) {
    console.error("Stripe error:", error.type, error.message);
    return jsonError(502, "Stripe couldn't complete that request. Please try again.");
  }
  console.error("API error:", error);
  return jsonError(500, "Something went wrong. Please try again.");
}
