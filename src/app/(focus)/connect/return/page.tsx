import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeftIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getOnboardingStatus, type OnboardingStatus } from "@/lib/connect";
import { isStripeAccountId } from "@/lib/listing-validation";
import { cn } from "@/lib/utils";

export const metadata = { title: "Stripe setup · Marketplace" };

// Stripe sends sellers here when they finish or leave onboarding. The status is
// read live from Stripe; saving it for Buy Now is a separate step.
export default function ConnectReturnPage({
  searchParams,
}: PageProps<"/connect/return">) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Back to Marketplace
      </Link>
      <Suspense
        fallback={
          <p role="status" className="flex items-center gap-2 text-muted-foreground">
            <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
            Checking your Stripe account...
          </p>
        }
      >
        <ReturnContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ReturnContent({
  searchParams,
}: Pick<PageProps<"/connect/return">, "searchParams">) {
  // This reads Stripe and the database (and saves the status), so wait for a real
  // request: prerendering must stop here.
  await connection();
  const { account } = await searchParams;
  if (!isStripeAccountId(account)) return <Result status="unknown" />;
  return <Result status={await getOnboardingStatus(account)} account={account} />;
}

const linkClassName = cn(buttonVariants({ size: "lg" }), "w-fit");

function Result({
  status,
  account,
}: {
  status: OnboardingStatus;
  account?: string;
}) {
  if (status === "connected") {
    return (
      <div className="flex flex-col items-start gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-brand text-brand-foreground">
          <CheckIcon aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-2xl font-bold">You&apos;re connected to Stripe</h1>
        <p className="max-w-md text-muted-foreground">
          Your Stripe account is set up. Listings that use this email can be bought
          with Buy Now, and your payouts go to your account.
        </p>
        <Link href="/" className={linkClassName}>
          Back to Marketplace
        </Link>
      </div>
    );
  }

  if (status === "incomplete") {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-bold">Your Stripe setup isn&apos;t finished</h1>
        <p className="max-w-md text-muted-foreground">
          Stripe still needs a few details before you can get paid. You can pick up
          where you left off.
        </p>
        {/* A plain link: this route redirects to Stripe and must not be prefetched. */}
        <a href={`/api/connect/refresh?account=${account}`} className={linkClassName}>
          Continue with Stripe
        </a>
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-bold">We couldn&apos;t check your account</h1>
        <p className="max-w-md text-muted-foreground">
          Something went wrong while checking with Stripe. Please try again in a
          moment.
        </p>
        <a href={account ? `/connect/return?account=${account}` : "/connect"} className={linkClassName}>
          Try again
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">We couldn&apos;t find that account</h1>
      <p className="max-w-md text-muted-foreground">
        This link doesn&apos;t match a Stripe account set up here. Start again with
        your listing email.
      </p>
      <Link href="/connect" className={linkClassName}>
        Connect with Stripe
      </Link>
    </div>
  );
}
