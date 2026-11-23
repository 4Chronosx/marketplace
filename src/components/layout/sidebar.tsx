import { Suspense } from "react";
import Link from "next/link";
import { CreditCardIcon, PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CategoryList, CategoryListFallback } from "./category-list";

type SidebarProps = {
  className?: string;
  /** Forwarded to links so the mobile drawer can close on navigation. */
  onNavigate?: () => void;
};

export function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <div className={cn("px-4 pb-6", className)}>
      <Link
        href="/create"
        onClick={onNavigate}
        className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}
      >
        <PlusIcon aria-hidden="true" />
        Create new listing
      </Link>
      <Link
        href="/connect"
        onClick={onNavigate}
        className={cn(buttonVariants({ size: "lg", variant: "outline" }), "mt-2 w-full")}
      >
        <CreditCardIcon aria-hidden="true" />
        Connect with Stripe
      </Link>
      <nav aria-label="Categories">
        <h2 className="px-2 pt-6 pb-3 text-lg font-bold">Categories</h2>
        {/* CategoryList reads the pathname; Suspense keeps the layout prerendered
            on routes whose params are unknown at build time. */}
        <Suspense fallback={<CategoryListFallback />}>
          <CategoryList onNavigate={onNavigate} />
        </Suspense>
      </nav>
    </div>
  );
}
