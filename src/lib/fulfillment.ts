import type Stripe from "stripe";
import {
  dbCreateOrder,
  dbGetListing,
  dbGetStripeAccountByEmail,
  dbMarkListingSold,
} from "./db";
import { isUuid } from "./listing-validation";
import { CURRENCY } from "./payments";
import { retrievePaymentIntentFee } from "./stripe";

// Turning a paid Checkout session into an order and a Sold listing. Server-only.
// Called by the webhook (the normal path) and by the order page (a fallback for
// when the webhook is late or can't be registered). Both run this same code, and
// it is safe to run twice for one session, so whichever comes second finds the
// saved order instead of creating another.

export type FulfillmentOutcome = "recorded" | "already_recorded" | "ignored";

/**
 * Saves the order for a paid session on one of our connected accounts, then
 * marks the listing Sold. `accountId` must already be known to be one of ours.
 * Anything that doesn't add up (unpaid, unknown listing, a seller that doesn't
 * own the listing) is ignored.
 */
export async function recordPaidSession(
  session: Stripe.Checkout.Session,
  accountId: string,
): Promise<FulfillmentOutcome> {
  if (session.payment_status !== "paid") return "ignored";

  // From here on the session is for one of our sellers, so anything odd is worth a log.
  const listingId = session.metadata?.listing_id;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  if (!isUuid(listingId) || !paymentIntentId) {
    console.warn("Fulfillment: paid session without a listing or payment:", session.id);
    return "ignored";
  }

  const listing = await dbGetListing(listingId);
  if (!listing) {
    console.warn("Fulfillment: paid session for an unknown listing:", session.id, listingId);
    return "ignored";
  }

  // The listing's seller must be the account that took the payment.
  const seller = await dbGetStripeAccountByEmail(listing.seller_email);
  if (seller?.stripe_account_id !== accountId) {
    console.warn("Fulfillment: session account does not own the listing:", session.id, listingId);
    return "ignored";
  }

  // Record what Stripe actually took, not a recomputed fee.
  const applicationFee = await retrievePaymentIntentFee(paymentIntentId, accountId);

  const { order, created } = await dbCreateOrder({
    listing_id: listing.id,
    buyer_email: session.customer_details?.email ?? null,
    stripe_account_id: accountId,
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    amount_total: session.amount_total ?? 0,
    application_fee: applicationFee,
    currency: session.currency ?? CURRENCY,
  });

  // The order exists first: the database refuses to mark a listing sold without one.
  const markedSold = await dbMarkListingSold(listing.id);
  if (created && !markedSold) {
    // Two buyers paid for the same listing. Keep the record; refund by hand.
    console.warn(
      `Fulfillment: listing ${listing.id} was already sold when order ${order.id} was paid. ` +
        `Refund payment ${paymentIntentId} on ${accountId}.`,
    );
  }

  return created ? "recorded" : "already_recorded";
}
