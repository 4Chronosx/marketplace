import Link from "next/link";
import type { ComponentType } from "react";
import { CarIcon, HouseIcon, LayersIcon, TagIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ListingType = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
};

const LISTING_TYPES: ListingType[] = [
  {
    title: "Item for sale",
    description: "Create a single listing for one item.",
    icon: TagIcon,
    href: "/create/item",
  },
  {
    title: "Create multiple listings",
    description: "Upload many items to sell at once.",
    icon: LayersIcon,
  },
  {
    title: "Vehicle for sale",
    description: "Sell a car, truck, motorcycle or boat.",
    icon: CarIcon,
  },
  {
    title: "Home for sale or rent",
    description: "List a house, condo or apartment.",
    icon: HouseIcon,
  },
];

const cardClassName =
  "flex h-full flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center";

export const metadata = { title: "Create new listing · Marketplace" };

export default function CreatePage() {
  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/"
        aria-label="Close and return to Marketplace"
        className="grid size-10 place-items-center rounded-full bg-muted text-foreground outline-none hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <XIcon aria-hidden="true" className="size-5" />
      </Link>

      <div>
        <h1 className="mb-4 text-2xl font-bold">Choose listing type</h1>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LISTING_TYPES.map(({ title, description, icon: Icon, href }) => {
            const body = (
              <>
                <span className="grid size-14 place-items-center rounded-full bg-muted">
                  <Icon aria-hidden="true" className="size-6 text-muted-foreground" />
                </span>
                <span className="font-bold">{title}</span>
                <span className="text-sm text-muted-foreground">{description}</span>
                {!href && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </>
            );

            return (
              <li key={title}>
                {href ? (
                  <Link
                    href={href}
                    className={cn(
                      cardClassName,
                      "outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
                    )}
                  >
                    {body}
                  </Link>
                ) : (
                  <div aria-disabled="true" className={cn(cardClassName, "opacity-60")}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
