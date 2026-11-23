import { getCategoryBySlug } from "./categories";

export const TITLE_MAX = 100;
export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 1000;
export const MESSAGE_MAX = 1000;
export const PRICE_MAX = 10_000_000;
/** One photo per listing (a single image_url column). */
export const ALLOWED_IMAGE_MIME: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
// Vercel Functions reject request bodies over about 4.5 MB, so stay under that.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTO_MB = MAX_PHOTO_BYTES / (1024 * 1024);
export const LIST_LIMIT_DEFAULT = 50;
export const LIST_LIMIT_MAX = 100;

export type ListingFields = {
  title: string;
  /** Seller's display name */
  name: string;
  /** Raw numeric text as typed, e.g. "1234.5" (see sanitizePriceInput). */
  price: string;
  /** Category slug */
  category: string;
  email: string;
  description: string;
};

export type FieldName = keyof ListingFields;
export type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Keep digits and at most one decimal point with up to 2 decimals. */
export function sanitizePriceInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, 2)}`;
}

export function parsePrice(price: string): number | null {
  if (price === "" || price === ".") return null;
  const value = Number(price);
  return Number.isFinite(value) ? value : null;
}

/** "1234.5" -> "1,234.5" (shown while the price field isn't focused). */
export function formatPriceInput(price: string): string {
  if (parsePrice(price) === null) return "";
  const [whole, fraction] = price.split(".");
  const grouped = Number(whole || "0").toLocaleString("en-US");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function validateListing(fields: ListingFields): FieldErrors {
  const errors: FieldErrors = {};

  const title = fields.title.trim();
  if (!title) errors.title = "Enter a title.";
  else if (title.length > TITLE_MAX)
    errors.title = `Keep the title under ${TITLE_MAX} characters.`;

  const name = fields.name.trim();
  if (!name) errors.name = "Enter your name.";
  else if (name.length > NAME_MAX)
    errors.name = `Keep your name under ${NAME_MAX} characters.`;

  const price = parsePrice(fields.price);
  if (price === null) errors.price = "Enter a price (use 0 for free).";
  else if (price < 0) errors.price = "Price can't be negative.";
  else if (price > PRICE_MAX) errors.price = "That price is too high.";

  if (!fields.category) errors.category = "Choose a category.";
  else if (!getCategoryBySlug(fields.category))
    errors.category = "Choose a valid category.";

  const email = fields.email.trim();
  if (!email) errors.email = "Enter your email so buyers can reach you.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";

  const description = fields.description.trim();
  if (!description) errors.description = "Add a short description.";
  else if (description.length > DESCRIPTION_MAX)
    errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;

  return errors;
}

// ---------------------------------------------------------------------------
// Server-side validation for the API routes. Pure functions, no I/O.
// ---------------------------------------------------------------------------

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Client form field names -> names used in the API payload.
const API_FIELD_NAMES: Partial<Record<FieldName, string>> = {
  name: "seller_name",
  email: "seller_email",
};

export type NewListingPayload = {
  title: string;
  description: string;
  price: number;
  category: string;
  seller_name: string;
  seller_email: string;
  image_url: string | null;
};

export function validateNewListingPayload(
  body: unknown,
  imageUrlPrefix: string | null,
): ValidationResult<NewListingPayload> {
  if (!isRecord(body)) {
    return { ok: false, errors: { body: "Send a JSON object." } };
  }

  const errors: Record<string, string> = {};
  const text = (key: string): string => {
    const value = body[key];
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") {
      errors[key] = `${key} must be text.`;
      return "";
    }
    return value;
  };

  const title = text("title");
  const description = text("description");
  const category = text("category");
  const sellerName = text("seller_name");
  const sellerEmail = text("seller_email");

  const price = body.price;
  if (typeof price !== "number" || !Number.isFinite(price)) {
    errors.price = "Price must be a number.";
  } else if (Math.round(price * 100) / 100 !== price) {
    errors.price = "Price can have at most 2 decimal places.";
  }

  // Reuse the exact rules the create form applies in the browser.
  const fieldErrors = validateListing({
    title,
    name: sellerName,
    price: typeof price === "number" ? String(price) : "",
    category,
    email: sellerEmail,
    description,
  });
  for (const [field, message] of Object.entries(fieldErrors)) {
    const key = API_FIELD_NAMES[field as FieldName] ?? field;
    errors[key] ??= message;
  }

  let imageUrl: string | null = null;
  const rawImage = body.image_url;
  if (rawImage !== undefined && rawImage !== null) {
    if (
      typeof rawImage === "string" &&
      rawImage.length <= 2048 &&
      imageUrlPrefix &&
      rawImage.startsWith(imageUrlPrefix)
    ) {
      imageUrl = rawImage;
    } else {
      errors.image_url = "Image must be uploaded through this site.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      title: title.trim(),
      description: description.trim(),
      price: price as number,
      category,
      seller_name: sellerName.trim(),
      seller_email: sellerEmail.trim(),
      image_url: imageUrl,
    },
  };
}

export type NewMessagePayload = {
  listing_id: string;
  buyer_email: string;
  message: string;
};

export function validateMessagePayload(
  body: unknown,
): ValidationResult<NewMessagePayload> {
  if (!isRecord(body)) {
    return { ok: false, errors: { body: "Send a JSON object." } };
  }

  const errors: Record<string, string> = {};

  if (!isUuid(body.listing_id)) {
    errors.listing_id = "listing_id must be a valid listing id.";
  }

  const buyerEmail =
    typeof body.buyer_email === "string" ? body.buyer_email.trim() : "";
  if (!buyerEmail) errors.buyer_email = "Enter your email so the seller can reply.";
  else if (!isValidEmail(buyerEmail))
    errors.buyer_email = "Enter a valid email address.";

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) errors.message = "Write a message before sending.";
  else if (message.length > MESSAGE_MAX)
    errors.message = `Keep the message under ${MESSAGE_MAX} characters.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      listing_id: body.listing_id as string,
      buyer_email: buyerEmail,
      message,
    },
  };
}

export function validateMessagesQuery(
  params: URLSearchParams,
): ValidationResult<{ listing_id: string }> {
  const listingId = params.get("listing_id");
  if (!isUuid(listingId)) {
    return {
      ok: false,
      errors: { listing_id: "listing_id must be a valid listing id." },
    };
  }
  return { ok: true, data: { listing_id: listingId } };
}

export type ConnectPayload = { seller_email: string };

const EMAIL_MAX = 255;

export function validateConnectPayload(
  body: unknown,
): ValidationResult<ConnectPayload> {
  if (!isRecord(body)) {
    return { ok: false, errors: { body: "Send a JSON object." } };
  }

  const email =
    typeof body.seller_email === "string" ? body.seller_email.trim() : "";
  if (!email) {
    return {
      ok: false,
      errors: { seller_email: "Enter the email you use on your listings." },
    };
  }
  if (!isValidEmail(email) || email.length > EMAIL_MAX) {
    return {
      ok: false,
      errors: { seller_email: "Enter a valid email address." },
    };
  }
  return { ok: true, data: { seller_email: email } };
}

const STRIPE_ACCOUNT_ID_RE = /^acct_[A-Za-z0-9]{1,64}$/;

export function isStripeAccountId(value: unknown): value is string {
  return typeof value === "string" && STRIPE_ACCOUNT_ID_RE.test(value);
}

export function validateAccountParam(
  params: URLSearchParams,
): ValidationResult<{ account: string }> {
  const account = params.get("account");
  if (!isStripeAccountId(account)) {
    return {
      ok: false,
      errors: { account: "account must be a valid Stripe account id." },
    };
  }
  return { ok: true, data: { account } };
}

export type ListingQuery = {
  category?: string;
  q?: string;
  limit: number;
  offset: number;
};

function intParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number | null {
  if (raw === null || raw === "") return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= min && value <= max ? value : null;
}

// Strip characters that have meaning inside a PostgREST `or(...)` filter.
function sanitizeSearch(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/[,()%*\\"'`:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return cleaned || undefined;
}

export function validateListingQuery(
  params: URLSearchParams,
): ValidationResult<ListingQuery> {
  const errors: Record<string, string> = {};

  const category = params.get("category") || undefined;
  if (category && !getCategoryBySlug(category)) {
    errors.category = "Unknown category.";
  }

  const limit = intParam(params.get("limit"), LIST_LIMIT_DEFAULT, 1, LIST_LIMIT_MAX);
  if (limit === null) {
    errors.limit = `limit must be a whole number from 1 to ${LIST_LIMIT_MAX}.`;
  }

  const offset = intParam(params.get("offset"), 0, 0, 100_000);
  if (offset === null) {
    errors.offset = "offset must be a whole number from 0 to 100000.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      category,
      q: sanitizeSearch(params.get("q")),
      limit: limit ?? LIST_LIMIT_DEFAULT,
      offset: offset ?? 0,
    },
  };
}

export type DetectedImage = {
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  ext: "jpg" | "png" | "webp" | "gif";
};

/** Identify an allowed image type from its first bytes (not its name or declared type). */
export function detectImageType(bytes: Uint8Array): DetectedImage | null {
  const at = (signature: number[], offset = 0) =>
    signature.every((byte, i) => bytes[offset + i] === byte);

  if (at([0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", ext: "png" };
  }
  // "GIF87a" / "GIF89a"
  if (at([0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return { mime: "image/gif", ext: "gif" };
  }
  // "RIFF" .... "WEBP"
  if (at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}
