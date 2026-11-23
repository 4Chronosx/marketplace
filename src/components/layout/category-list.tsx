"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CATEGORIES, categoryHref } from "@/lib/categories";

const linkClassName =
  "block rounded-md px-2 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground";
const activeClassName = "bg-brand/10 font-semibold text-brand hover:bg-brand/15 hover:text-brand";

type CategoryListProps = {
  /** Called after a link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
};

// Reads the pathname, so it must sit inside a <Suspense> boundary in layouts
// (see CategoryListFallback and Sidebar).
export function CategoryList({ onNavigate }: CategoryListProps) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {CATEGORIES.map((category) => {
        const href = categoryHref(category.slug);
        const isActive = pathname === href;
        return (
          <li key={category.slug}>
            <Link
              href={href}
              aria-current={isActive ? "page" : undefined}
              onClick={onNavigate}
              className={cn(linkClassName, isActive && activeClassName)}
            >
              {category.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Static, pathname-free version shown while CategoryList suspends.
export function CategoryListFallback() {
  return (
    <ul className="flex flex-col gap-0.5">
      {CATEGORIES.map((category) => (
        <li key={category.slug}>
          <Link href={categoryHref(category.slug)} className={linkClassName}>
            {category.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
