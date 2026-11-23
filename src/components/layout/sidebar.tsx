import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { CategoryList, CategoryListFallback } from "./category-list";

type SidebarProps = {
  className?: string;
  /** Forwarded to links so the mobile drawer can close on navigation. */
  onNavigate?: () => void;
};

export function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <nav aria-label="Categories" className={cn("px-4 pb-6", className)}>
      <h2 className="px-2 pt-6 pb-3 text-lg font-bold">Categories</h2>
      {/* CategoryList reads the pathname; Suspense keeps the layout prerendered
          on routes whose params are unknown at build time. */}
      <Suspense fallback={<CategoryListFallback />}>
        <CategoryList onNavigate={onNavigate} />
      </Suspense>
    </nav>
  );
}
