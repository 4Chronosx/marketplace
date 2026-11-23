import type Stripe from "stripe";
import { dbGetStripeAccountById, dbUpdateStripeAccountStatus } from "./db";
import { recordPaidSession, type FulfillmentOutcome } from "./fulfillment";
import { getStripe } from "./stripe";

// What to do with a verified Stripe event. Server-only; the route has already
// checked the signature, so everything here can trust the event came from Stripe.

export type EventOutcome = FulfillmentOutcome | "synced";

/**
 * A seller's Stripe account changed (for example they finished onboarding).
 * Events can arrive late or out of order, so the account's current state is
 * read from Stripe instead of trusting the event body. Accounts this app didn't
 * save are ignored before any Stripe call: the sandbox is shared.
 */
async function handleAccountUpdated(event: Stripe.AccountUpdatedEvent): Promise<EventOutcome> {
  const accountId = event.data.object.id;
  if (!(await dbGetStripeAccountById(accountId))) return "ignored";

  const account = await getStripe().accounts.retrieve(accountId);
  await dbUpdateStripeAccountStatus(accountId, {
    details_submitted: account.details_submitted ?? false,
    charges_enabled: account.charges_enabled ?? false,
  });
  return "synced";
}

/**
 * Handles the events this app cares about:
 * - `checkout.session.completed`: records the order and marks the listing Sold
 *   (see recordPaidSession).
 * - `account.updated`: refreshes a seller's saved onboarding status.
 *
 * The sandbox is shared, so this endpoint also receives events from other
 * accounts, other apps' sessions and event types it doesn't handle. All of
 * those are ignored (the route still answers 200 so Stripe stops retrying).
 * Safe to run twice for the same event: Stripe retries.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<EventOutcome> {
  if (event.type === "account.updated") return handleAccountUpdated(event);
  if (event.type !== "checkout.session.completed") return "ignored";

  // Only payments made on a connected account that this app saved.
  const accountId = event.account;
  if (!accountId || !(await dbGetStripeAccountById(accountId))) return "ignored";

  return recordPaidSession(event.data.object, accountId);
}
