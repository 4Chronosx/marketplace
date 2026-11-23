import Link from "next/link";
import { formatPrice, type Listing } from "@/lib/listings";
import { ListingImage } from "./listing-image";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/item/${listing.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="overflow-hidden rounded-xl transition-shadow duration-200 group-hover:shadow-md motion-reduce:transition-none">
        <ListingImage
          src={listing.image_url}
          alt={listing.title}
          className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <div className="px-0.5 pt-2">
        <p className="text-lg font-semibold">{formatPrice(listing.price)}</p>
        <p className="line-clamp-1 text-sm text-foreground/80 group-hover:underline">
          {listing.title}
        </p>
        <p className="text-sm text-muted-foreground">{listing.location}</p>
      </div>
    </Link>
  );
}
