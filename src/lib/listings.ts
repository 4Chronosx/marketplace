// Mirrors the `listings` table (see supabase-schema.sql). Data is loaded from
// the /api routes in the browser (src/lib/api-client.ts) and queried on the
// server in src/lib/db.ts.
export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  /** Category slug, see src/lib/categories.ts */
  category: string;
  location: string;
  seller_name: string;
  seller_email: string;
  image_url: string | null;
  /** ISO 8601 */
  created_at: string;
};

/** What a card in the browse grid needs; GET /api/listings returns only this. */
export type ListingSummary = Pick<
  Listing,
  "id" | "title" | "price" | "category" | "location" | "image_url" | "created_at"
>;

export function formatPrice(price: number): string {
  if (price === 0) return "Free";
  const fractionDigits = Number.isInteger(price) ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(price);
}
