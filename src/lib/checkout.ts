import { NotFoundError, dbGetListing, dbGetStripeAccountByEmail } from "./db";
import {
  PurchaseNotAllowedError,
  getBuyStatus,
  platformFee,
  toMinorUnits,
} from "./payments";
import { createCheckoutSession, getStripe } from "./stripe";

// Buy Now: decides whether a listing can be bought and opens Stripe Checkout.
// Server-only. The price always comes from the database, never from the caller.

/**
 * Creates a Checkout Session for a listing and returns its URL. The charge is
 * created on the seller's connected account (a direct charge) and the
 * marketplace keeps an application fee.
 */
export async function createListingCheckout(
  listingId: string,
  origin: string,
): Promise<string> {
  const listing = await dbGetListing(listingId);
  if (!listing) throw new NotFoundError("Listing not found.");

  const account = await dbGetStripeAccountByEmail(listing.seller_email);
  const status = getBuyStatus(listing, account !== null);
  if (status !== "ready" || account === null) {
    throw new PurchaseNotAllowedError(status === "ready" ? "no_seller_account" : status);
  }

  // The saved flags aren't synced from Stripe yet, so ask Stripe directly: a
  // seller who started onboarding but never finished can't take a payment.
  const stripeAccount = await getStripe().accounts.retrieve(account.stripe_account_id);
  if (!stripeAccount.charges_enabled) {
    throw new PurchaseNotAllowedError("seller_not_ready");
  }

  const amountCents = toMinorUnits(listing.price);
  return createCheckoutSession({
    stripeAccountId: account.stripe_account_id,
    listingId: listing.id,
    title: listing.title,
    amountCents,
    feeCents: platformFee(amountCents),
    origin,
  });
}
