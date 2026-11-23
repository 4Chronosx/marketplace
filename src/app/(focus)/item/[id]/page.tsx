import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { categoryHref, getCategoryBySlug } from "@/lib/categories";
import { formatPrice, getListingById, getListings } from "@/lib/listings";
import { ListedTime } from "@/components/marketplace/listed-time";
import { ListingImage } from "@/components/marketplace/listing-image";
import { MessageForm } from "@/components/marketplace/message-form";

// Every mock listing id is known at build time.
export async function generateStaticParams() {
  const listings = await getListings();
  return listings.map((listing) => ({ id: listing.id }));
}

export default async function ItemPage({ params }: PageProps<"/item/[id]">) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

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
        />

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold break-words">{listing.title}</h1>
            <p className="text-2xl font-bold">{formatPrice(listing.price)}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Listed <ListedTime iso={listing.created_at} /> in {listing.location}
            </p>
          </div>

          <section aria-labelledby="description-heading">
            <h2 id="description-heading" className="text-sm font-medium">
              Description
            </h2>
            <p className="mt-1 text-sm break-words whitespace-pre-line text-foreground/80">
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
