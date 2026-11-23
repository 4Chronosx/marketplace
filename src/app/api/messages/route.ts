import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { dbCreateMessage, dbListMessages } from "@/lib/db";
import {
  validateMessagePayload,
  validateMessagesQuery,
} from "@/lib/listing-validation";

// GET /api/messages?listing_id=<uuid>  (newest first)
export async function GET(request: Request) {
  const query = validateMessagesQuery(new URL(request.url).searchParams);
  if (!query.ok) return jsonError(400, "Invalid query.", query.errors);

  try {
    return Response.json({
      messages: await dbListMessages(query.data.listing_id),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

// POST /api/messages  { listing_id, buyer_email, message }
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const payload = validateMessagePayload(body);
  if (!payload.ok) return jsonError(400, "Invalid message.", payload.errors);

  try {
    const message = await dbCreateMessage(payload.data);
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
