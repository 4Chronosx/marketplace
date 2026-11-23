import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Order · Marketplace" };

// Where Stripe Checkout sends the buyer after paying. Placeholder: the order
// confirmation (reading the saved order) replaces this in a later step.
export default function OrderSuccessPage() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">Thanks for your purchase</h1>
      <p className="max-w-md text-muted-foreground">
        Your payment was submitted. Your order details will appear here soon.
      </p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Back to Marketplace
      </Link>
    </div>
  );
}
