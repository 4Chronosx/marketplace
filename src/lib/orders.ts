import {
  dbGetListing,
  dbGetOrderBySessionId,
  dbGetStripeAccountByEmail,
} from "./db";
import { getStripe, isStripeError } from "./stripe";

// The order confirmation the success page shows. Server-only. Everything here is
// safe to show the buyer: no buyer email, no Stripe ids, no platform fee.

export type OrderSummary = {
  /** Short, human-friendly reference taken from the order id. */
  reference: string;
  /** Smallest currency unit (cents). */
  amount_total: number;
  currency: string;
  /** ISO 8601 */
  created_at: string;
  listing: {
    id: string;
    title: string;
    image_url: string | null;
    seller_name: string;
  };
};

export type OrderLookup =
  /** The order is saved. */
  | { status: "ready"; order: OrderSummary }
  /** Stripe says it was paid, but the webhook hasn't saved the order yet. */
  | { status: "confirming" }
  /** Not a real, paid session for this marketplace. */
  | { status: "unknown" };

/**
 * Finds the order for a Checkout session. The buyer can land on the success
 * page before the webhook has saved the order, so when there is no order yet
 * we ask Stripe whether this session really was paid; only then do we say
 * "confirming" instead of "unknown".
 */
export async function getOrderLookup(
  sessionId: string,
  listingId: string | null,
): Promise<OrderLookup> {
  const order = await dbGetOrderBySessionId(sessionId);
  if (order) {
    const listing = await dbGetListing(order.listing_id);
    if (!listing) return { status: "unknown" };
    return {
      status: "ready",
      order: {
        reference: order.id.slice(0, 8).toUpperCase(),
        amount_total: order.amount_total,
        currency: order.currency,
        created_at: order.created_at,
        listing: {
          id: listing.id,
          title: listing.title,
          image_url: listing.image_url,
          seller_name: listing.seller_name,
        },
      },
    };
  }

  if (!listingId) return { status: "unknown" };
  const listing = await dbGetListing(listingId);
  if (!listing) return { status: "unknown" };
  const account = await dbGetStripeAccountByEmail(listing.seller_email);
  if (!account) return { status: "unknown" };

  try {
    const session = await getStripe().checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: account.stripe_account_id },
    );
    const paidForThisListing =
      session.payment_status === "paid" && session.metadata?.listing_id === listingId;
    return { status: paidForThisListing ? "confirming" : "unknown" };
  } catch (error) {
    // A session that doesn't exist on this seller's account.
    if (isStripeError(error) && error.code === "resource_missing") {
      return { status: "unknown" };
    }
    throw error;
  }
}
