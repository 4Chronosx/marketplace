import { DatabaseError, NotFoundError } from "./db";
import { SupabaseNotConfiguredError } from "./supabase";

/** `{ error: { message, fields? } }` with the given HTTP status. */
export function jsonError(
  status: number,
  message: string,
  fields?: Record<string, string>,
): Response {
  return Response.json(
    { error: fields ? { message, fields } : { message } },
    { status },
  );
}

/** Parses a JSON request body; returns undefined when it isn't valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Maps thrown errors to responses. Unexpected errors are logged, never leaked. */
export function handleRouteError(error: unknown): Response {
  if (error instanceof SupabaseNotConfiguredError) {
    return jsonError(503, "The database is not configured yet.");
  }
  if (error instanceof NotFoundError) {
    return jsonError(404, error.message);
  }
  // Postgres foreign key violation: the referenced listing doesn't exist.
  if (error instanceof DatabaseError && error.code === "23503") {
    return jsonError(404, "Listing not found.");
  }
  console.error("API error:", error);
  return jsonError(500, "Something went wrong. Please try again.");
}
