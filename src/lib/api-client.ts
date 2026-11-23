// Browser-side client for our own /api routes (see src/app/api).
import type { Listing, ListingSummary } from "./listings";
import { LIST_LIMIT_MAX, type NewListingPayload } from "./listing-validation";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.fields = fields;
  }
}

type ErrorBody = {
  error?: { message?: string; fields?: Record<string, string> };
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiRequestError(
      0,
      "Can't reach the server. Check your connection and try again.",
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON body: fall through to the generic message below.
  }

  if (!response.ok) {
    const details = (body as ErrorBody | null)?.error;
    throw new ApiRequestError(
      response.status,
      details?.message ?? "Something went wrong. Please try again.",
      details?.fields,
    );
  }
  return body as T;
}

export async function fetchListings(
  filters: { category?: string; q?: string },
  signal?: AbortSignal,
): Promise<ListingSummary[]> {
  const params = new URLSearchParams({ limit: String(LIST_LIMIT_MAX) });
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  const { listings } = await request<{ listings: ListingSummary[] }>(
    `/api/listings?${params}`,
    { signal },
  );
  return listings;
}

export async function fetchListing(
  id: string,
  signal?: AbortSignal,
): Promise<Listing> {
  const { listing } = await request<{ listing: Listing }>(
    `/api/listings/${encodeURIComponent(id)}`,
    { signal },
  );
  return listing;
}

export function uploadImage(file: File): Promise<{ url: string; path: string }> {
  const form = new FormData();
  form.append("file", file);
  return request("/api/upload", { method: "POST", body: form });
}

export async function createListing(payload: NewListingPayload): Promise<Listing> {
  const { listing } = await request<{ listing: Listing }>("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return listing;
}

export async function sendMessage(input: {
  listingId: string;
  buyerEmail: string;
  message: string;
}): Promise<void> {
  await request("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listing_id: input.listingId,
      buyer_email: input.buyerEmail,
      message: input.message,
    }),
  });
}
