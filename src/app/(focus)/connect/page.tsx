import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ConnectForm } from "@/components/marketplace/connect-form";

export const metadata = { title: "Connect with Stripe · Marketplace" };

// `searchParams` is only known at request time, so it is awaited inside Suspense.
export default function ConnectPage({ searchParams }: PageProps<"/connect">) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Back to Marketplace
      </Link>
      <h1 className="text-2xl font-bold">Connect with Stripe</h1>
      <p className="max-w-md text-muted-foreground">
        Get paid when your items sell. Buyers pay through Stripe, and the money
        goes to your account minus a small platform fee.
      </p>
      <Suspense fallback={<ConnectForm />}>
        <ConnectContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ConnectContent({
  searchParams,
}: Pick<PageProps<"/connect">, "searchParams">) {
  const { error } = await searchParams;
  return (
    <ConnectForm
      notice={
        error === "refresh"
          ? "That Stripe link expired and we couldn't make a new one. Enter your email to try again."
          : undefined
      }
    />
  );
}
