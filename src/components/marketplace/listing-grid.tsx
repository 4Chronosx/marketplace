import type { ListingSummary } from "@/lib/listings";
import { ListingCard } from "./listing-card";

// 1 column on phones, then 2 / 3 / 4 / 5 as the viewport widens.
export const LISTING_GRID_CLASSNAME =
  "grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

export function ListingGrid({ listings }: { listings: ListingSummary[] }) {
  return (
    <ul className={LISTING_GRID_CLASSNAME}>
      {listings.map((listing) => (
        <li key={listing.id}>
          <ListingCard listing={listing} />
        </li>
      ))}
    </ul>
  );
}
