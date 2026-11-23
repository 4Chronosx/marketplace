import { dbGetStripeAccountById } from "@/lib/db";
import { validateAccountParam } from "@/lib/listing-validation";
import { createOnboardingLink } from "@/lib/stripe";

// GET /api/connect/refresh?account=acct_...
// Stripe sends the seller here when an onboarding link expired or was already
// used. We make a fresh link and redirect to it. Only accounts saved by this
// app qualify, and one that already finished gets no new link.
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const failed = `${origin}/connect?error=refresh`;

  const query = validateAccountParam(searchParams);
  if (!query.ok) return Response.redirect(failed, 302);

  let target = failed;
  try {
    const known = await dbGetStripeAccountById(query.data.account);
    if (known) {
      const result = await createOnboardingLink(known.stripe_account_id, origin);
      target = result.connected
        ? `${origin}/connect/return?account=${known.stripe_account_id}`
        : result.url;
    }
  } catch (error) {
    console.error("Onboarding refresh failed:", error);
  }
  return Response.redirect(target, 302);
}
