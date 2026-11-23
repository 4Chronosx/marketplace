import type { Listing, ListingSummary } from "./listings";
import type {
  DetectedImage,
  ListingQuery,
  NewListingPayload,
  NewMessagePayload,
} from "./listing-validation";
import { getSupabase, LISTING_IMAGES_BUCKET } from "./supabase";

// Typed server-side queries. API routes call these today; Phase 5 server
// components can call them directly instead of fetching our own API.

const DEFAULT_LOCATION = "Palo Alto, CA";

export class NotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends Error {
  code?: string;
  constructor(error: { message: string; code?: string }) {
    super(error.message);
    this.name = "DatabaseError";
    this.code = error.code;
  }
}

export type Message = {
  id: string;
  listing_id: string;
  buyer_email: string;
  seller_email: string;
  message: string;
  /** ISO 8601 */
  created_at: string;
};

const LISTING_COLUMNS =
  "id, title, description, price, category, location, seller_name, seller_email, image_url, created_at";
const SUMMARY_COLUMNS = "id, title, price, category, location, image_url, created_at";
const MESSAGE_COLUMNS =
  "id, listing_id, buyer_email, seller_email, message, created_at";

type ListingRow = {
  id: string;
  title: string;
  description: string | null;
  price: number | string;
  category: string;
  location: string | null;
  seller_name: string;
  seller_email: string;
  image_url: string | null;
  created_at: string;
};

type SummaryRow = Pick<
  ListingRow,
  "id" | "title" | "price" | "category" | "location" | "image_url" | "created_at"
>;

function toSummary(row: SummaryRow): ListingSummary {
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    category: row.category,
    location: row.location ?? DEFAULT_LOCATION,
    image_url: row.image_url,
    created_at: row.created_at,
  };
}

function toListing(row: ListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    price: Number(row.price),
    category: row.category,
    location: row.location ?? DEFAULT_LOCATION,
    seller_name: row.seller_name,
    seller_email: row.seller_email,
    image_url: row.image_url,
    created_at: row.created_at,
  };
}

export async function dbListListings(
  query: ListingQuery,
): Promise<ListingSummary[]> {
  const { category, q, limit, offset } = query;

  // Cards only need a few columns; skip the description and seller email.
  // Search still matches on description in the database.
  let request = getSupabase()
    .from("listings")
    .select(SUMMARY_COLUMNS)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) request = request.eq("category", category);
  // `q` is stripped of PostgREST filter metacharacters in validateListingQuery.
  if (q) request = request.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await request;
  if (error) throw new DatabaseError(error);
  return (data as unknown as SummaryRow[]).map(toSummary);
}

export async function dbGetListing(id: string): Promise<Listing | null> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new DatabaseError(error);
  return data ? toListing(data as unknown as ListingRow) : null;
}

export async function dbCreateListing(input: NewListingPayload): Promise<Listing> {
  const { data, error } = await getSupabase()
    .from("listings")
    .insert(input)
    .select(LISTING_COLUMNS)
    .single();
  if (error) throw new DatabaseError(error);
  return toListing(data as unknown as ListingRow);
}

export async function dbListMessages(listingId: string): Promise<Message[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  if (error) throw new DatabaseError(error);
  return data as unknown as Message[];
}

export async function dbCreateMessage(input: NewMessagePayload): Promise<Message> {
  const supabase = getSupabase();

  // seller_email always comes from the listing, never from the request.
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("seller_email")
    .eq("id", input.listing_id)
    .maybeSingle();
  if (listingError) throw new DatabaseError(listingError);
  if (!listing) throw new NotFoundError("Listing not found.");

  const { data, error } = await supabase
    .from("messages")
    .insert({
      listing_id: input.listing_id,
      buyer_email: input.buyer_email,
      seller_email: (listing as { seller_email: string }).seller_email,
      message: input.message,
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw new DatabaseError(error);
  return data as unknown as Message;
}

export async function dbUploadListingImage(
  file: File,
  image: DetectedImage,
): Promise<{ url: string; path: string }> {
  const path = `${crypto.randomUUID()}.${image.ext}`;
  const bucket = getSupabase().storage.from(LISTING_IMAGES_BUCKET);

  // Content type comes from the sniffed bytes, not the client-declared one.
  const { error } = await bucket.upload(path, file, {
    contentType: image.mime,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw new DatabaseError({ message: error.message });

  return { url: bucket.getPublicUrl(path).data.publicUrl, path };
}
