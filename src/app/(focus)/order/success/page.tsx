import { Suspense } from "react";
import {
  OrderConfirmation,
  OrderConfirmationSkeleton,
} from "@/components/marketplace/order-confirmation";

export const metadata = { title: "Order · Marketplace" };

// Where Stripe Checkout sends the buyer after paying, with `session_id` and
// `listing_id` in the URL. `searchParams` is only known at request time, so it
// is awaited inside Suspense.
export default function OrderSuccessPage({
  searchParams,
}: PageProps<"/order/success">) {
  return (
    <Suspense fallback={<OrderConfirmationSkeleton />}>
      <OrderContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderContent({
  searchParams,
}: Pick<PageProps<"/order/success">, "searchParams">) {
  const { session_id, listing_id } = await searchParams;
  return (
    <OrderConfirmation
      sessionId={typeof session_id === "string" ? session_id : undefined}
      listingId={typeof listing_id === "string" ? listing_id : undefined}
    />
  );
}
