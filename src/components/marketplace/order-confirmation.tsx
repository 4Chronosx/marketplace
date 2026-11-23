"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ApiRequestError, fetchOrder } from "@/lib/api-client";
import { isCheckoutSessionId } from "@/lib/listing-validation";
import { formatPrice } from "@/lib/listings";
import type { OrderSummary } from "@/lib/orders";
import { ListingImage } from "./listing-image";
import { ErrorNotice, Notice } from "./notice";

// The buyer can reach this page before Stripe's webhook has saved the order, so
// it asks every couple of seconds for a little while, then offers a manual retry.
const POLL_MS = 2000;
const MAX_POLLS = 15;

type View =
  | { kind: "ready"; order: OrderSummary }
  | { kind: "confirming" }
  | { kind: "slow" }
  | { kind: "unknown" }
  | { kind: "error"; error: ApiRequestError };

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function OrderConfirmationSkeleton() {
  return (
    <p role="status" className="flex items-center gap-2 text-muted-foreground">
      <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
      Checking your order...
    </p>
  );
}

function OrderNotFound() {
  return (
    <Notice
      title="We couldn't find that order"
      action={
        <Link href="/" className={buttonVariants()}>
          Back to Marketplace
        </Link>
      }
    >
      This link may be wrong or incomplete. If you were charged, check your email
      receipt from Stripe.
    </Notice>
  );
}

export function OrderConfirmation({
  sessionId,
  listingId,
}: {
  sessionId?: string;
  listingId?: string;
}) {
  const valid = isCheckoutSessionId(sessionId);
  const [view, setView] = useState<View | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isCheckoutSessionId(sessionId)) return;
    const controller = new AbortController();

    (async () => {
      for (let poll = 0; poll < MAX_POLLS; poll++) {
        try {
          const result = await fetchOrder(sessionId, listingId, controller.signal);
          if (controller.signal.aborted) return;
          if (result.status === "ready") {
            setView({ kind: "ready", order: result.order });
            return;
          }
          setView({ kind: "confirming" });
        } catch (error) {
          if (controller.signal.aborted) return;
          if (error instanceof ApiRequestError && error.status === 404) {
            setView({ kind: "unknown" });
            return;
          }
          setView({
            kind: "error",
            error:
              error instanceof ApiRequestError
                ? error
                : new ApiRequestError(0, "Something went wrong. Please try again."),
          });
          return;
        }
        await wait(POLL_MS, controller.signal);
        if (controller.signal.aborted) return;
      }
      setView({ kind: "slow" });
    })();

    return () => controller.abort();
  }, [sessionId, listingId, attempt]);

  function checkAgain() {
    setView(null);
    setAttempt((n) => n + 1);
  }

  // A malformed id can never be an order, so don't even ask the server.
  if (!valid) return <OrderNotFound />;

  // Kept mounted so screen readers announce the switch from "confirming" to done.
  return (
    <div aria-live="polite">
      {view === null && <OrderConfirmationSkeleton />}

      {view?.kind === "confirming" && (
        <Notice title="Payment received" role="status">
          <span className="flex items-center gap-2">
            <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
            We&apos;re confirming your order. This usually takes a few seconds.
          </span>
        </Notice>
      )}

      {view?.kind === "slow" && (
        <Notice
          title="We're still confirming your order"
          action={
            <Button type="button" variant="outline" onClick={checkAgain}>
              Check again
            </Button>
          }
        >
          Your payment went through, but it&apos;s taking longer than usual to show up
          here. You don&apos;t need to pay again.
        </Notice>
      )}

      {view?.kind === "unknown" && <OrderNotFound />}

      {view?.kind === "error" && <ErrorNotice error={view.error} onRetry={checkAgain} />}

      {view?.kind === "ready" && <OrderReceipt order={view.order} />}
    </div>
  );
}

function OrderReceipt({ order }: { order: OrderSummary }) {
  const { listing } = order;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-brand text-brand-foreground">
          <CheckIcon aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-2xl font-bold">Thanks for your purchase!</h1>
        <p className="max-w-md text-muted-foreground">
          Your payment went through. Message the seller on the listing page to arrange
          pickup or delivery. Order <span className="font-mono">#{order.reference}</span>.
        </p>
      </div>

      <div className="flex max-w-xl gap-4 rounded-xl border bg-card p-4">
        <ListingImage
          src={listing.image_url}
          alt={listing.title}
          sizes="96px"
          className="w-24 shrink-0"
        />
        <div className="min-w-0">
          <p className="font-semibold wrap-break-word">{listing.title}</p>
          <p className="text-sm text-muted-foreground">Sold by {listing.seller_name}</p>
          <p className="mt-2 text-lg font-bold">{formatPrice(order.amount_total / 100)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/item/${listing.id}`}
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          View listing
        </Link>
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          Back to Marketplace
        </Link>
      </div>
    </div>
  );
}
