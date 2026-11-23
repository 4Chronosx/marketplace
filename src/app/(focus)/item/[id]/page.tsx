import { Suspense } from "react";
import {
  ItemDetails,
  ItemDetailsSkeleton,
} from "@/components/marketplace/item-details";

// Listing ids come from the database, so there's nothing to prerender per id.
// `params` is only known at request time, so it is awaited inside Suspense.
export default function ItemPage({ params }: PageProps<"/item/[id]">) {
  return (
    <Suspense fallback={<ItemDetailsSkeleton />}>
      <ItemContent params={params} />
    </Suspense>
  );
}

async function ItemContent({
  params,
}: Pick<PageProps<"/item/[id]">, "params">) {
  const { id } = await params;
  return <ItemDetails id={id} />;
}
