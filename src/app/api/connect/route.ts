import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { startSellerOnboarding } from "@/lib/connect";
import { validateConnectPayload } from "@/lib/listing-validation";

// POST /api/connect  { seller_email }
// -> { url } (send the seller to Stripe's hosted onboarding)
// -> { connected: true } (this email already finished onboarding)
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const payload = validateConnectPayload(body);
  if (!payload.ok) return jsonError(400, "Invalid email.", payload.errors);

  try {
    const result = await startSellerOnboarding(
      payload.data.seller_email,
      new URL(request.url).origin,
    );
    return Response.json(
      result.connected ? { connected: true } : { url: result.url },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
