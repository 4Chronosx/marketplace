import { handleRouteError, jsonError } from "@/lib/api";
import { constructWebhookEvent, isSignatureError } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/webhook";

// POST /api/stripe/webhook  (called by Stripe, not by the browser)
// Verifies the signature, then records confirmed payments. Answers 200 for any
// verified event, including ones it ignores, so Stripe doesn't keep retrying.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError(400, "Missing Stripe signature.");

  // The signature covers the exact bytes Stripe sent, so read the raw text.
  // Parsing it as JSON first would change the bytes and fail verification.
  const rawBody = await request.text();

  let event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (error) {
    if (isSignatureError(error)) return jsonError(400, "Invalid Stripe signature.");
    return handleRouteError(error);
  }

  try {
    await handleStripeEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    // 5xx: Stripe retries, and handleStripeEvent is safe to run again.
    return handleRouteError(error);
  }
}
