import { dbGetStripeAccountById, dbGetStripeAccountByEmail, dbUpsertStripeAccount } from "./db";
import {
  createConnectedAccount,
  createOnboardingLink,
  getStripe,
  type OnboardingLink,
} from "./stripe";

// Seller onboarding: ties the Stripe account to the seller's email in Supabase.
// Server-only, like db.ts and stripe.ts.

/**
 * Starts (or resumes) onboarding for a seller email. Reuses the saved Stripe
 * account when there is one, so the same email never gets two accounts. An
 * account that already finished onboarding gets no new link.
 */
export async function startSellerOnboarding(
  sellerEmail: string,
  origin: string,
): Promise<OnboardingLink> {
  const email = sellerEmail.trim().toLowerCase();
  const existing = await dbGetStripeAccountByEmail(email);
  const accountId = existing?.stripe_account_id ?? (await saveNewAccount(email));
  return createOnboardingLink(accountId, origin);
}

async function saveNewAccount(email: string): Promise<string> {
  const stripeAccountId = await createConnectedAccount(email);
  // If another request saved this email first, that row wins and is returned.
  const saved = await dbUpsertStripeAccount({
    seller_email: email,
    stripe_account_id: stripeAccountId,
  });
  return saved.stripe_account_id;
}

export type OnboardingStatus =
  /** Stripe can take payments for this seller. */
  | "connected"
  /** Known account that can't take payments yet (onboarding not finished). */
  | "incomplete"
  /** Not an account saved by this app. */
  | "unknown"
  /** Couldn't check (database or Stripe unavailable). */
  | "unavailable";

/** Live check used by the return page; only accounts saved by this app qualify. */
export async function getOnboardingStatus(
  stripeAccountId: string,
): Promise<OnboardingStatus> {
  try {
    const known = await dbGetStripeAccountById(stripeAccountId);
    if (!known) return "unknown";
    const account = await getStripe().accounts.retrieve(stripeAccountId);
    return account.charges_enabled ? "connected" : "incomplete";
  } catch (error) {
    console.error("Onboarding status check failed:", error);
    return "unavailable";
  }
}
