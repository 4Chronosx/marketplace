export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 1000;
export const PRICE_MAX = 10_000_000;
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type ListingFields = {
  title: string;
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

  const price = parsePrice(fields.price);
  if (price === null) errors.price = "Enter a price (use 0 for free).";
  else if (price > PRICE_MAX) errors.price = "That price is too high.";

  if (!fields.category) errors.category = "Choose a category.";

  const email = fields.email.trim();
  if (!email) errors.email = "Enter your email so buyers can reach you.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";

  const description = fields.description.trim();
  if (!description) errors.description = "Add a short description.";
  else if (description.length > DESCRIPTION_MAX)
    errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;

  return errors;
}
