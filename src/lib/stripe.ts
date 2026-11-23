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
