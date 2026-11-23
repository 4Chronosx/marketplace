import { handleRouteError, jsonError } from "@/lib/api";
import { isCheckoutSessionId, isUuid } from "@/lib/listing-validation";
import { getOrderLookup } from "@/lib/orders";

// GET /api/orders/[sessionId]?listing_id=<uuid>
// 200 { order }          the order is saved (if Stripe says the session was paid but
//                        the webhook hasn't saved it, it is saved right here)
// 202 { pending: true }  paid, but saving the order failed; ask again shortly
// 404                    not a real, paid session for this marketplace
// Never cached: the answer changes as soon as the order is saved.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/orders/[sessionId]">,
) {
  const { sessionId } = await ctx.params;
  if (!isCheckoutSessionId(sessionId)) return jsonError(404, "Order not found.");

  const listingParam = new URL(request.url).searchParams.get("listing_id");
  const listingId = isUuid(listingParam) ? listingParam : null;
  const noStore = { "Cache-Control": "no-store" };

  try {
    const result = await getOrderLookup(sessionId, listingId);
    if (result.status === "ready") {
      return Response.json({ order: result.order }, { headers: noStore });
    }
    if (result.status === "confirming") {
      return Response.json({ pending: true }, { status: 202, headers: noStore });
    }
    return jsonError(404, "Order not found.");
  } catch (error) {
    return handleRouteError(error);
  }
}
