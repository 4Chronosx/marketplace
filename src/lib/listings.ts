import { MOCK_LISTINGS } from "./mock-listings";

// Shaped like the planned Supabase `listings` table so the data functions below
// can be swapped for real queries without touching the UI.
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

export type ListingFilters = {
  category?: string;
};

export type NewListingInput = {
  title: string;
  description: string;
  price: number;
  category: string;
  seller_name: string;
  seller_email: string;
  photos: File[];
};

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

export async function getListings(
  filters: ListingFilters = {},
): Promise<Listing[]> {
  const { category } = filters;
  return category
    ? MOCK_LISTINGS.filter((listing) => listing.category === category)
    : MOCK_LISTINGS;
}

export async function getListingById(id: string): Promise<Listing | undefined> {
  return MOCK_LISTINGS.find((listing) => listing.id === id);
}

// TODO(step 10): replace with a POST to /api/listings (Supabase insert + image upload).
export async function createListing(input: NewListingInput): Promise<void> {
  void input;
  await new Promise((resolve) => setTimeout(resolve, 600));
}

// TODO(step 10): replace with a POST to /api/messages (Supabase insert).
export async function sendMessage(input: {
  listingId: string;
  buyerEmail: string;
  message: string;
}): Promise<void> {
  void input;
  await new Promise((resolve) => setTimeout(resolve, 600));
}
