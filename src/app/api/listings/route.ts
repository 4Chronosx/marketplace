import { cachedJson, handleRouteError, jsonError, readJson } from "@/lib/api";
import { dbCreateListing, dbListListings } from "@/lib/db";
import {
  validateListingQuery,
  validateNewListingPayload,
} from "@/lib/listing-validation";
import { listingImageUrlPrefix } from "@/lib/supabase";

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
    return Response.json({ listing }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
