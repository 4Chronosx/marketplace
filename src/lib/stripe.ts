import { createHash } from "node:crypto";
import Stripe from "stripe";

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

export type OnboardingLink =
  | { connected: true }
  | { connected: false; url: string };

/**
 * A fresh hosted-onboarding link for a connected account. An account that has
 * already submitted its details gets no link: anyone who knows a seller's email
 * must not be able to reopen onboarding for a finished account.
 */
export async function createOnboardingLink(
  accountId: string,
  origin: string,
): Promise<OnboardingLink> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  if (account.details_submitted) return { connected: true };

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: `${origin}/connect/return?account=${accountId}`,
    refresh_url: `${origin}/api/connect/refresh?account=${accountId}`,
  });
  return { connected: false, url: link.url };
}
