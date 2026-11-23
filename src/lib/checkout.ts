import { NotFoundError, dbGetListing, dbGetStripeAccountByEmail } from "./db";
import {
  PurchaseNotAllowedError,
  getBuyStatus,
  platformFee,
  toMinorUnits,
} from "./payments";
import { persistAccountStatus } from "./connect";
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
  // Whether the seller can take charges is checked live below, not from the saved
  // flag, so a flag that is out of date can't block a seller who just finished.
  const status = getBuyStatus(listing, account ? "ready" : "none");
  if (status !== "ready" || account === null) {
    throw new PurchaseNotAllowedError(status === "ready" ? "no_seller_account" : status);
  }

  // Stripe is the authority: a seller who started onboarding but never finished
  // can't take a payment. What we learn is saved for the page to show.
  const stripeAccount = await getStripe().accounts.retrieve(account.stripe_account_id);
  await persistAccountStatus(stripeAccount);
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
