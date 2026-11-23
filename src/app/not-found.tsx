import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/marketplace/notice";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <Notice
        title="Page not found"
        action={
          <Link href="/" className={buttonVariants()}>
            Back to Marketplace
          </Link>
        }
      >
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </Notice>
    </main>
  );
}
