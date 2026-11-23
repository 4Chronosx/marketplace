import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { CreateItemForm } from "@/components/marketplace/create-item-form";

export const metadata = { title: "Item for sale · Marketplace" };

export default function CreateItemPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/create"
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Choose listing type
      </Link>
      <h1 className="text-2xl font-bold">Item for sale</h1>
      <CreateItemForm />
    </div>
  );
}
