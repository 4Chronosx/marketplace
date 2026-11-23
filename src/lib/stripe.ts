import { createHash } from "node:crypto";
import Stripe from "stripe";
import { CURRENCY } from "./payments";

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured. Set STRIPE_SECRET_KEY.");
    this.name = "StripeNotConfiguredError";
  }
}

let client: Stripe | null = null;

// Server-only: the secret key has no NEXT_PUBLIC_ prefix, so it never reaches
// the browser. Created lazily, like getSupabase(), so the app builds and runs
// without keys (routes answer 503 until configured).
export function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError();

  client = new Stripe(key);
  return client;
}

export function isStripeError(error: unknown): error is Stripe.errors.StripeError {
  return error instanceof Stripe.errors.StripeError;
}

/**
 * Creates a Standard connected account for a seller. Standard (not Express):
 * the sandbox platform rejects legacy account types that make the platform the
 * losses collector, and Standard is the type direct charges are built for.
 * The idempotency key is derived from the email, so a double submit gets the
 * same account back instead of creating a second one.
 */
export async function createConnectedAccount(email: string): Promise<string> {
  const idempotencyKey = `connect-account-${createHash("sha256").update(email).digest("hex")}`;
  const account = await getStripe().accounts.create(
    {
      type: "standard",
      country: "US",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { seller_email: email },
    },
    { idempotencyKey },
  );
  return account.id;
}

/**
 * Opens a hosted Checkout page for one listing as a direct charge on the
 * seller's connected account; `feeCents` is the marketplace's application fee.
 * Returns the Checkout URL.
 */
export async function createCheckoutSession(input: {
  stripeAccountId: string;
  listingId: string;
  title: string;
  amountCents: number;
  feeCents: number;
  origin: string;
}): Promise<string> {
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: input.amountCents,
            product_data: { name: input.title },
          },
        },
      ],
      payment_intent_data: { application_fee_amount: input.feeCents },
      client_reference_id: input.listingId,
      metadata: { listing_id: input.listingId },
      success_url: `${input.origin}/order/success?session_id={CHECKOUT_SESSION_ID}&listing_id=${input.listingId}`,
      cancel_url: `${input.origin}/item/${input.listingId}`,
    },
    { stripeAccount: input.stripeAccountId },
  );
  if (!session.url) {
    throw new Error("Stripe returned a Checkout Session without a URL.");
  }
  return session.url;
}

export type OnboardingLink =
  | { connected: true }
  | { connected: false; url: string };

/**
 * A fresh hosted-onboarding link for a connected account. An account that can
 * already take payments gets no link: anyone who knows a seller's email must not
 * be able to reopen onboarding for a finished account. "Finished" means
 * `charges_enabled`, not `details_submitted`: an account can submit its details
 * and still owe Stripe something (e.g. an ID number), and its owner needs a way
 * back in to fix that.
 */
export async function createOnboardingLink(
  accountId: string,
  origin: string,
): Promise<OnboardingLink> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  if (account.charges_enabled) return { connected: true };

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: `${origin}/connect/return?account=${accountId}`,
    refresh_url: `${origin}/api/connect/refresh?account=${accountId}`,
  });
  return { connected: false, url: link.url };
}
