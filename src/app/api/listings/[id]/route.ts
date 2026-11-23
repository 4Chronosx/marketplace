import { cachedJson, handleRouteError, jsonError } from "@/lib/api";
import { dbGetListing } from "@/lib/db";
import { isUuid } from "@/lib/listing-validation";

// GET /api/listings/[id]
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/listings/[id]">,
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(404, "Listing not found.");

  try {
    const listing = await dbGetListing(id);
    if (!listing) return jsonError(404, "Listing not found.");
    return cachedJson({ listing }, "detail");
  } catch (error) {
    return handleRouteError(error);
  }
}
