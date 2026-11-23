import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPrice, type ListingSummary } from "@/lib/listings";
import { cn } from "@/lib/utils";
import { ListingImage } from "./listing-image";

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const sold = listing.status === "sold";

  return (
    <Link
      href={`/item/${listing.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative overflow-hidden rounded-xl transition-shadow duration-200 group-hover:shadow-md motion-reduce:transition-none">
        <ListingImage
          src={listing.image_url}
          alt={listing.title}
          fit="cover"
          className={cn(
            "transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            sold && "opacity-60",
          )}
        />
        {sold && <Badge className="absolute top-2 left-2">Sold</Badge>}
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
