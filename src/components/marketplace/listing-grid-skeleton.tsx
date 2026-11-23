import { LISTING_GRID_CLASSNAME } from "./listing-grid";

// Pulsing placeholder cards, same column ladder as the real grid.
export function ListingGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        Loading listings...
      </span>
      <ul className={LISTING_GRID_CLASSNAME} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <li key={index}>
            <div className="aspect-square animate-pulse rounded-xl bg-muted" />
            <div className="flex flex-col gap-2 px-0.5 pt-2">
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
