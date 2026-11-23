import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { createListingCheckout } from "@/lib/checkout";
import { validateCheckoutPayload } from "@/lib/listing-validation";

// POST /api/checkout  { listing_id }  -> { url } (Stripe Checkout for that listing)
// The price is read from the database; the request can't supply one.
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const payload = validateCheckoutPayload(body);
  if (!payload.ok) return jsonError(400, "Invalid checkout request.", payload.errors);

  try {
    const url = await createListingCheckout(
      payload.data.listing_id,
      new URL(request.url).origin,
    );
    return Response.json({ url });
  } catch (error) {
    return handleRouteError(error);
  }
}
