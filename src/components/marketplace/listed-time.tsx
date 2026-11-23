"use client";

import { Suspense, use, useState } from "react";
import { io } from "next/cache";

function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

function formatAge(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "just now";
  if (minutes < 60) return plural(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return plural(days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return plural(months, "month");
  return plural(Math.floor(months / 12), "year");
}

function Age({ iso }: { iso: string }) {
  // Cache Components: reading the clock must be deferred past prerendering.
  use(io());
  // Captured once per mount so the text is stable across re-renders.
  const [now] = useState(() => Date.now());
  return <>{formatAge(iso, now)}</>;
}

// Renders e.g. "1 hour ago". The static shell shows "recently" until the
// browser resolves the current time.
export function ListedTime({ iso }: { iso: string }) {
  return (
    <Suspense fallback="recently">
      <Age iso={iso} />
    </Suspense>
  );
}
