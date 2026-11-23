"use client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/marketplace/notice";

// Catches unexpected render errors below the browse layout (the rail stays).
export default function BrowseError({ reset }: { reset: () => void }) {
  return (
    <Notice
      role="alert"
      title="Something went wrong"
      action={
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
      }
    >
      We couldn&apos;t load this page. Please try again.
    </Notice>
  );
}
