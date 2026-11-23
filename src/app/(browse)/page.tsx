import { getListings } from "@/lib/listings";
import { ItemGrid } from "@/components/marketplace/item-grid";

export default async function Home() {
  const listings = await getListings();

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Today&apos;s picks</h1>
      <ItemGrid listings={listings} />
    </>
  );
}
