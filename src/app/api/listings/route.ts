import { cachedJson, handleRouteError, jsonError, readJson } from "@/lib/api";
import { dbCreateListing, dbGetStripeAccountByEmail, dbListListings } from "@/lib/db";
import {
  validateListingQuery,
  validateNewListingPayload,
} from "@/lib/listing-validation";
import { sellerPaymentsOf, type SellerPayments } from "@/lib/payments";
import { listingImageUrlPrefix } from "@/lib/supabase";

// Does this seller still need to connect Stripe? Only a hint for the prompt shown
// after publishing, so if the lookup fails the listing is still created and the
// seller is simply asked.
async function sellerPaymentsFor(email: string): Promise<SellerPayments> {
  try {
    return sellerPaymentsOf(await dbGetStripeAccountByEmail(email));
  } catch (error) {
    console.error("Looking up the seller's Stripe account failed:", error);
    return "none";
  }
}

// GET /api/listings?category=&q=&limit=&offset=
export async function GET(request: Request) {
  const query = validateListingQuery(new URL(request.url).searchParams);
  if (!query.ok) return jsonError(400, "Invalid query.", query.errors);

  try {
    return cachedJson({ listings: await dbListListings(query.data) }, "list");
  } catch (error) {
    return handleRouteError(error);
  }
}

// POST /api/listings  { title, description, price, category, seller_name, seller_email, image_url? }
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const payload = validateNewListingPayload(body, listingImageUrlPrefix());
  if (!payload.ok) return jsonError(400, "Invalid listing.", payload.errors);

  try {
    const listing = await dbCreateListing(payload.data);
    const seller_payments = await sellerPaymentsFor(listing.seller_email);
    return Response.json({ listing, seller_payments }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
