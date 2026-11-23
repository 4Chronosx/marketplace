export type Category = {
  slug: string;
  name: string;
};

// Source of truth for marketplace categories (order matches the design mockups).
export const CATEGORIES: readonly Category[] = [
  { slug: "vehicles", name: "Vehicles" },
  { slug: "property-rentals", name: "Property Rentals" },
  { slug: "apparel", name: "Apparel" },
  { slug: "classifieds", name: "Classifieds" },
  { slug: "electronics", name: "Electronics" },
  { slug: "entertainment", name: "Entertainment" },
  { slug: "family", name: "Family" },
  { slug: "free-stuff", name: "Free Stuff" },
  { slug: "garden-outdoor", name: "Garden & Outdoor" },
  { slug: "hobbies", name: "Hobbies" },
  { slug: "home-goods", name: "Home Goods" },
  { slug: "home-improvement", name: "Home Improvement" },
  { slug: "home-sales", name: "Home Sales" },
  { slug: "musical-instruments", name: "Musical Instruments" },
  { slug: "office-supplies", name: "Office Supplies" },
  { slug: "pet-supplies", name: "Pet Supplies" },
  { slug: "sporting-goods", name: "Sporting Goods" },
  { slug: "toys-games", name: "Toys & Games" },
  { slug: "buy-and-sell-groups", name: "Buy and sell groups" },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function categoryHref(slug: string): string {
  return `/category/${slug}`;
}
