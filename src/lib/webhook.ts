import type Stripe from "stripe";
import {
  dbCreateOrder,
  dbGetListing,
  dbGetStripeAccountByEmail,
  dbGetStripeAccountById,
  dbMarkListingSold,
} from "./db";
import { isUuid } from "./listing-validation";
import { CURRENCY } from "./payments";
import { retrievePaymentIntentFee } from "./stripe";

// What to do with a verified Stripe event. Server-only; the route has already
// checked the signature, so everything here can trust the event came from Stripe.

export type EventOutcome = "recorded" | "already_recorded" | "ignored";

/**
 * Records a confirmed payment: saves the order, then marks the listing Sold.
 *
 * The sandbox is shared, so this endpoint also receives events from other
 * accounts, other apps' sessions and event types it doesn't handle. All of
 * those are ignored (the route still answers 200 so Stripe stops retrying).
 * Safe to run twice for the same event: Stripe retries, and a second run
 * finds the saved order instead of creating another.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<EventOutcome> {
  if (event.type !== "checkout.session.completed") return "ignored";

  // Only payments made on a connected account that this app saved.
  const accountId = event.account;
  if (!accountId || !(await dbGetStripeAccountById(accountId))) return "ignored";

  const session = event.data.object;
  if (session.payment_status !== "paid") return "ignored";

  // From here on the event is for one of our sellers, so anything odd is worth a log.
  const listingId = session.metadata?.listing_id;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  if (!isUuid(listingId) || !paymentIntentId) {
    console.warn("Webhook: paid session without a listing or payment:", session.id);
    return "ignored";
  }

  const listing = await dbGetListing(listingId);
  if (!listing) {
    console.warn("Webhook: paid session for an unknown listing:", session.id, listingId);
    return "ignored";
  }

  // The listing's seller must be the account that took the payment.
  const seller = await dbGetStripeAccountByEmail(listing.seller_email);
  if (seller?.stripe_account_id !== accountId) {
    console.warn("Webhook: session account does not own the listing:", session.id, listingId);
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
      `Webhook: listing ${listing.id} was already sold when order ${order.id} was paid. ` +
        `Refund payment ${paymentIntentId} on ${accountId}.`,
    );
  }

  return created ? "recorded" : "already_recorded";
}
