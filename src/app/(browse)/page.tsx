import { Suspense } from "react";
import { ItemGrid } from "@/components/marketplace/item-grid";
import { ListingGridSkeleton } from "@/components/marketplace/listing-grid-skeleton";
import { SearchForm } from "@/components/marketplace/search-form";

export default function Home() {
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Today&apos;s picks</h1>
      <SearchForm action="/" />
      {/* ItemGrid reads the ?q= search param, which needs a Suspense boundary. */}
      <Suspense fallback={<ListingGridSkeleton />}>
        <ItemGrid />
      </Suspense>
    </>
  );
}
