import { notFound } from "next/navigation";
import { CATEGORIES, getCategoryBySlug } from "@/lib/categories";
import { getListings } from "@/lib/listings";
import { ItemGrid } from "@/components/marketplace/item-grid";

// Every slug is known at build time, so the layout's active-link sidebar
// resolves during prerendering.
export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage({
  params,
}: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const listings = await getListings({ category: category.slug });

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">{category.name}</h1>
      <ItemGrid
        listings={listings}
        emptyMessage="No listings in this category yet."
      />
    </>
  );
}
