"use client";

import { Suspense } from "react";
import Form from "next/form";
import { useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SearchFields({
  action,
  defaultValue,
}: {
  action: string;
  defaultValue: string;
}) {
  return (
    <Form action={action} role="search" className="mb-4 flex max-w-xl gap-2">
      <label htmlFor="listing-search" className="sr-only">
        Search listings
      </label>
      <Input
        key={defaultValue}
        id="listing-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search listings"
        autoComplete="off"
        maxLength={100}
      />
      <Button type="submit">
        <SearchIcon aria-hidden="true" />
        Search
      </Button>
    </Form>
  );
}

function SearchFormWithParams({ action }: { action: string }) {
  const q = useSearchParams().get("q") ?? "";
  return <SearchFields action={action} defaultValue={q} />;
}

// A GET form: submitting navigates to `${action}?q=...` (works without JS too).
// useSearchParams needs a Suspense boundary under Cache Components.
export function SearchForm({ action }: { action: string }) {
  return (
    <Suspense fallback={<SearchFields action={action} defaultValue="" />}>
      <SearchFormWithParams action={action} />
    </Suspense>
  );
}
