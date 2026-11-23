"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { fetchListing } from "@/lib/api-client";
import { categoryHref, getCategoryBySlug } from "@/lib/categories";
import { isUuid } from "@/lib/listing-validation";
import { formatPrice } from "@/lib/listings";
import { useApiResource } from "@/lib/use-api-resource";
import { BuyNow } from "./buy-now";
import { ListedTime } from "./listed-time";
import { ListingImage } from "./listing-image";
import { MessageForm } from "./message-form";
import { ErrorNotice, Notice } from "./notice";

export function ItemDetailsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading listing...
      </span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          <div className="aspect-4/3 animate-pulse rounded-xl bg-muted" />
          <div className="flex flex-col gap-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-24 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingNotFound() {
  return (
    <Notice
      title="Listing not found"
      action={
        <Link href="/" className={buttonVariants()}>
          Back to Marketplace
        </Link>
      }
    >
      This listing may have been removed, or the link may be wrong.
    </Notice>
  );
}

// Loads one listing from /api/listings/[id].
export function ItemDetails({ id }: { id: string }) {
  const valid = isUuid(id);
  const {
    data: listing,
    error,
    loading,
    retry,
  } = useApiResource(valid ? `listing:${id}` : null, (signal) =>
    fetchListing(id, signal),
  );

  // A malformed id can never exist, so don't even ask the server.
  if (!valid || error?.status === 404) return <ListingNotFound />;
  if (loading) return <ItemDetailsSkeleton />;
  if (error) return <ErrorNotice error={error} onRetry={retry} />;
  if (!listing) return null;

  const category = getCategoryBySlug(listing.category);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={category ? categoryHref(category.slug) : "/"}
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Back to {category?.name ?? "Marketplace"}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <ListingImage
          src={listing.image_url}
          alt={listing.title}
          aspectClassName="aspect-4/3"
          sizes="(min-width: 1024px) 60vw, 100vw"
        />

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold wrap-break-word">{listing.title}</h1>
            <p className="flex items-center gap-2 text-2xl font-bold">
              {formatPrice(listing.price)}
              {listing.status === "sold" && <Badge>Sold</Badge>}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Listed <ListedTime iso={listing.created_at} /> in {listing.location}
            </p>
          </div>

          <BuyNow listingId={listing.id} buyStatus={listing.buy_status} />

          <section aria-labelledby="description-heading">
            <h2 id="description-heading" className="text-sm font-medium">
              Description
            </h2>
            <p className="mt-1 text-sm wrap-break-word whitespace-pre-line text-foreground/80">
              {listing.description}
            </p>
          </section>

          <section aria-labelledby="seller-heading">
            <h2 id="seller-heading" className="text-sm font-medium">
              Seller information
            </h2>
            <p className="mt-1 text-sm">{listing.seller_name}</p>
            <a
              href={`mailto:${listing.seller_email}`}
              className="text-sm text-brand underline-offset-4 hover:underline"
            >
              {listing.seller_email}
            </a>
          </section>

          <MessageForm listingId={listing.id} sellerName={listing.seller_name} />
        </div>
      </div>
    </div>
  );
}
