"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiRequestError, startCheckout } from "@/lib/api-client";
import type { BuyStatus } from "@/lib/payments";

const UNAVAILABLE_TEXT: Record<Exclude<BuyStatus, "ready">, string> = {
  sold: "This item has been sold.",
  no_seller_account:
    "This seller hasn't set up online payments yet. You can message them below.",
  price_unsupported:
    "This item can't be bought online. You can message the seller below.",
};

export function BuyNow({
  listingId,
  buyStatus,
}: {
  listingId: string;
  buyStatus: BuyStatus;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coming back from Stripe with the browser's back button can restore this page
  // exactly as it was left, with the button still busy.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  if (buyStatus !== "ready") {
    return (
      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        {UNAVAILABLE_TEXT[buyStatus]}
      </p>
    );
  }

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const url = await startCheckout(listingId);
      window.location.assign(url);
      // Stay busy while the browser leaves for Stripe.
      return;
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.status === 503
            ? "Payments can't be started right now because Stripe isn't configured yet."
            : caught.message
          : "Couldn't start checkout. Please try again.",
      );
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        className="h-11 w-full text-base"
        onClick={onClick}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2Icon aria-hidden="true" className="animate-spin" />
            Opening checkout...
          </>
        ) : (
          "Buy Now"
        )}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className={error ? "text-sm text-destructive" : "sr-only"}
      >
        {error ?? ""}
      </p>
    </div>
  );
}
