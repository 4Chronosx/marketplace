"use client";

import { useEffect, useState } from "react";
import { CreditCardIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiRequestError, startStripeOnboarding } from "@/lib/api-client";

// Shown right after a seller publishes a listing, when their email has no Stripe
// account that can take payments yet. One click sends them to Stripe with the
// email they just used, so there is nothing to type.
export function ConnectPrompt({
  email,
  unfinished,
}: {
  email: string;
  /** They started Stripe setup before but never finished it. */
  unfinished: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Coming back from Stripe with the browser's back button can restore this page
  // exactly as it was left, with the button still busy.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function onClick() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await startStripeOnboarding(email);
      if ("url" in result) {
        window.location.assign(result.url);
        // Stay busy while the browser leaves for Stripe.
        return;
      }
      setMessage({
        text: "You're already connected to Stripe. Buyers can pay you with Buy Now.",
        error: false,
      });
    } catch (error) {
      setMessage({
        text:
          error instanceof ApiRequestError
            ? error.status === 503
              ? "Payments can't be set up right now because Stripe isn't configured yet."
              : error.message
            : "Couldn't reach Stripe. Please try again.",
        error: true,
      });
    }
    setBusy(false);
  }

  return (
    <section
      aria-labelledby="connect-prompt-heading"
      className="flex flex-col items-start gap-3 rounded-xl border bg-brand/5 p-6"
    >
      <span className="grid size-10 place-items-center rounded-full bg-brand/10 text-brand">
        <CreditCardIcon aria-hidden="true" className="size-5" />
      </span>
      <h2 id="connect-prompt-heading" className="text-lg font-bold">
        {unfinished ? "Finish setting up Stripe" : "Get paid when it sells"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {unfinished
          ? "Your Stripe setup isn't finished, so buyers can't pay you online yet. Pick up where you left off."
          : "Connect Stripe so buyers can pay you online with Buy Now. It takes a couple of minutes. You can skip it, and buyers can still message you."}
      </p>
      <Button type="button" size="lg" onClick={onClick} disabled={busy}>
        {busy ? (
          <>
            <Loader2Icon aria-hidden="true" className="animate-spin" />
            Opening Stripe...
          </>
        ) : (
          "Connect with Stripe"
        )}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className={message?.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
      >
        {message?.text ?? ""}
      </p>
    </section>
  );
}
