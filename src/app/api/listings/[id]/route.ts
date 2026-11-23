import { cachedJson, handleRouteError, jsonError } from "@/lib/api";
import { dbGetListing, dbGetStripeAccountByEmail } from "@/lib/db";
import { isUuid } from "@/lib/listing-validation";
import type { ListingDetail } from "@/lib/listings";
import { getBuyStatus, sellerPaymentsOf } from "@/lib/payments";

// GET /api/listings/[id]  (the listing plus `buy_status`: can it be bought now?)
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/listings/[id]">,
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "Listing not found.");

  try {
    const listing = await dbGetListing(id);
    if (!listing) return jsonError(404, "Listing not found.");
    const account = await dbGetStripeAccountByEmail(listing.seller_email);
    const detail: ListingDetail = {
      ...listing,
      buy_status: getBuyStatus(listing, sellerPaymentsOf(account)),
    };
    return cachedJson({ listing: detail }, "detail");
  } catch (error) {
    return handleRouteError(error);
  }
}
