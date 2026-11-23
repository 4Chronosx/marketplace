import type { Listing } from "@/lib/listings";
import { ListingCard } from "./listing-card";

type ItemGridProps = {
  listings: Listing[];
  emptyMessage?: string;
};

// 1 column on phones, then 2 / 3 / 4 / 5 as the viewport widens.
export function ItemGrid({
  listings,
  emptyMessage = "No listings yet.",
}: ItemGridProps) {
  if (listings.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {listings.map((listing) => (
        <li key={listing.id}>
          <ListingCard listing={listing} />
        </li>
      ))}
    </ul>
  );
}
