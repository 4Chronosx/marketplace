// Browser-side client for our own /api routes (see src/app/api).
import type { Listing, ListingDetail, ListingSummary } from "./listings";
import { LIST_LIMIT_MAX, type NewListingPayload } from "./listing-validation";
import type { OrderSummary } from "./orders";

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

// A stalled request would otherwise leave the loading state up forever.
const REQUEST_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 60_000;

async function request<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiRequestError(
        0,
        "The server took too long to respond. Please try again.",
      );
    }
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
): Promise<ListingDetail> {
  const { listing } = await request<{ listing: ListingDetail }>(
    `/api/listings/${encodeURIComponent(id)}`,
    { signal },
  );
  return listing;
}

export function uploadImage(file: File): Promise<{ url: string; path: string }> {
  const form = new FormData();
  form.append("file", file);
  return request("/api/upload", { method: "POST", body: form }, UPLOAD_TIMEOUT_MS);
}

export async function createListing(payload: NewListingPayload): Promise<Listing> {
  const { listing } = await request<{ listing: Listing }>("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return listing;
}

export type OrderResult =
  | { status: "ready"; order: OrderSummary }
  | { status: "confirming" };

/**
 * The order for a Checkout session. "confirming" means Stripe took the payment
 * but the webhook hasn't saved the order yet; an unknown order throws a 404.
 */
export async function fetchOrder(
  sessionId: string,
  listingId?: string,
  signal?: AbortSignal,
): Promise<OrderResult> {
  const query = listingId ? `?listing_id=${encodeURIComponent(listingId)}` : "";
  const body = await request<{ order?: OrderSummary; pending?: boolean }>(
    `/api/orders/${encodeURIComponent(sessionId)}${query}`,
    { signal },
  );
  return body.order ? { status: "ready", order: body.order } : { status: "confirming" };
}

/** Opens Stripe Checkout for a listing; resolves to the Checkout URL. */
export async function startCheckout(listingId: string): Promise<string> {
  const { url } = await request<{ url: string }>("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listing_id: listingId }),
  });
  return url;
}

export type OnboardingStart = { url: string } | { connected: true };

/** Asks the server for Stripe's hosted onboarding link for this seller email. */
export function startStripeOnboarding(sellerEmail: string): Promise<OnboardingStart> {
  return request("/api/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seller_email: sellerEmail }),
  });
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
