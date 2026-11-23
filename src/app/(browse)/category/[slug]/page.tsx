import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CATEGORIES, categoryHref, getCategoryBySlug } from "@/lib/categories";
import { ItemGrid } from "@/components/marketplace/item-grid";
import { ListingGridSkeleton } from "@/components/marketplace/listing-grid-skeleton";
import { SearchForm } from "@/components/marketplace/search-form";

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

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">{category.name}</h1>
      <SearchForm action={categoryHref(category.slug)} />
      <Suspense fallback={<ListingGridSkeleton />}>
        <ItemGrid category={category.slug} categoryName={category.name} />
      </Suspense>
    </>
  );
}
