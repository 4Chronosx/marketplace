"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { fetchListings } from "@/lib/api-client";
import { categoryHref } from "@/lib/categories";
import { useApiResource } from "@/lib/use-api-resource";
import { ListingGrid } from "./listing-grid";
import { ListingGridSkeleton } from "./listing-grid-skeleton";
import { ErrorNotice, Notice } from "./notice";

type ItemGridProps = {
  /** Category slug to filter by. */
  category?: string;
  categoryName?: string;
};

// Loads listings from /api/listings, filtered by `category` and the `q`
// search param. Must be rendered inside <Suspense> (useSearchParams).
export function ItemGrid({ category, categoryName }: ItemGridProps) {
  const q = (useSearchParams().get("q") ?? "").trim();
  const { data, error, loading, retry } = useApiResource(
    `listings:${category ?? ""}:${q}`,
    (signal) => fetchListings({ category, q: q || undefined }, signal),
  );

  if (loading) return <ListingGridSkeleton />;
  if (error) return <ErrorNotice error={error} onRetry={retry} />;
  if (!data || data.length === 0) {
    return <EmptyListings q={q} category={category} categoryName={categoryName} />;
  }
  return <ListingGrid listings={data} />;
}

function EmptyListings({
  q,
  category,
  categoryName,
}: {
  q: string;
  category?: string;
  categoryName?: string;
}) {
  if (q) {
    return (
      <Notice
        title="No listings match your search"
        action={
          <Link
            href={category ? categoryHref(category) : "/"}
            className={buttonVariants({ variant: "outline" })}
          >
            Clear search
          </Link>
        }
      >
        {`Nothing found for “${q}”. Try a different word.`}
      </Notice>
    );
  }

  return (
    <Notice
      title={categoryName ? `No listings in ${categoryName} yet` : "No listings yet"}
      action={
        <Link href="/create" className={buttonVariants()}>
          <PlusIcon aria-hidden="true" />
          Create new listing
        </Link>
      }
    >
      Be the first to sell something here.
    </Notice>
  );
}
