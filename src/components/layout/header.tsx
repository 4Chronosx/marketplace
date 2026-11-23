import Link from "next/link";
import { MobileNav } from "./mobile-nav";

// Mobile: slim sticky top bar (logo + menu button).
// Desktop (md+): the brand block at the top of the left rail, as in the mockups.
export function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:static md:h-auto md:flex-col md:items-start md:justify-start md:border-b-0 md:px-6 md:pt-6">
      <Link
        href="/"
        className="flex items-center gap-2 md:flex-col md:items-start md:gap-1"
      >
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-full bg-brand text-2xl leading-none font-bold text-brand-foreground"
        >
          f
        </span>
        <span className="text-lg font-bold">Marketplace</span>
      </Link>
      <MobileNav />
    </header>
  );
}
