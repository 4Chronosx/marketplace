"use client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/marketplace/notice";

// Catches unexpected render errors on the item and create pages.
export default function FocusError({ reset }: { reset: () => void }) {
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
