"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { createListing, formatPrice, nameFromEmail } from "@/lib/listings";
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  formatPriceInput,
  isValidEmail,
  parsePrice,
  sanitizePriceInput,
  validateListing,
  type FieldName,
  type ListingFields,
} from "@/lib/listing-validation";
import { ListingImage } from "./listing-image";
import { PhotoDropzone, type Photo } from "./photo-dropzone";

const DEFAULT_LOCATION = "Palo Alto, CA";
const CATEGORY_ITEMS = CATEGORIES.map((c) => ({ value: c.slug, label: c.name }));
const FIELD_ORDER: FieldName[] = ["title", "price", "category", "email", "description"];
const EMPTY_FIELDS: ListingFields = {
  title: "",
  price: "",
  category: "",
  email: "",
  description: "",
};

type Status = "idle" | "submitting" | "done" | "error";

function Field({
  name,
  label,
  error,
  children,
}: {
  name: FieldName;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`field-${name}`} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`field-${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function CreateItemForm() {
  const [fields, setFields] = useState<ListingFields>(EMPTY_FIELDS);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [priceFocused, setPriceFocused] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const errors = validateListing(fields);
  const visibleError = (name: FieldName) =>
    attempted || touched[name] ? errors[name] : undefined;

  const a11y = (name: FieldName) => ({
    id: `field-${name}`,
    "aria-invalid": visibleError(name) ? (true as const) : undefined,
    "aria-describedby": visibleError(name) ? `field-${name}-error` : undefined,
  });

  const setField = (name: FieldName, value: string) =>
    setFields((current) => ({ ...current, [name]: value }));
  const touch = (name: FieldName) =>
    setTouched((current) => ({ ...current, [name]: true }));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);

    const firstInvalid = FIELD_ORDER.find((name) => errors[name]);
    if (firstInvalid) {
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }

    setStatus("submitting");
    try {
      await createListing({
        title: fields.title.trim(),
        description: fields.description.trim(),
        price: parsePrice(fields.price) ?? 0,
        category: fields.category,
        seller_email: fields.email.trim(),
        photos: photos.map((photo) => photo.file),
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    setFields(EMPTY_FIELDS);
    setPhotos([]);
    setTouched({});
    setAttempted(false);
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <div className="flex max-w-xl flex-col items-start gap-3 rounded-xl border p-6">
        <CheckCircle2Icon aria-hidden="true" className="size-8 text-brand" />
        <h2 className="text-xl font-bold">Your listing is ready</h2>
        <p>
          &ldquo;{fields.title.trim()}&rdquo; for {formatPrice(parsePrice(fields.price) ?? 0)}.
        </p>
        <p className="text-sm text-muted-foreground">
          Heads up: listings aren&apos;t saved yet. Publishing is connected in the
          database step.
        </p>
        <div className="flex gap-2">
          <Link href="/" className={buttonVariants()}>
            Back to Marketplace
          </Link>
          <Button type="button" variant="outline" onClick={reset}>
            Create another
          </Button>
        </div>
      </div>
    );
  }

  const price = parsePrice(fields.price);
  const sellerName = isValidEmail(fields.email) ? nameFromEmail(fields.email) : "Your name";
  const submitting = status === "submitting";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <PhotoDropzone photos={photos} onChange={setPhotos} />

        <Field name="title" label="Title" error={visibleError("title")}>
          <Input
            {...a11y("title")}
            autoComplete="off"
            maxLength={TITLE_MAX + 20}
            value={fields.title}
            onChange={(e) => setField("title", e.target.value)}
            onBlur={() => touch("title")}
          />
        </Field>

        <Field name="price" label="Price" error={visibleError("price")}>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground"
            >
              $
            </span>
            <Input
              {...a11y("price")}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              className="pl-6"
              value={priceFocused ? fields.price : formatPriceInput(fields.price)}
              onFocus={() => setPriceFocused(true)}
              onChange={(e) => setField("price", sanitizePriceInput(e.target.value))}
              onBlur={() => {
                setPriceFocused(false);
                touch("price");
              }}
            />
          </div>
        </Field>

        <Field name="category" label="Category" error={visibleError("category")}>
          <Select
            items={CATEGORY_ITEMS}
            value={fields.category || null}
            onValueChange={(value) => {
              setField("category", value ?? "");
              touch("category");
            }}
          >
            <SelectTrigger {...a11y("category")} className="w-full">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field name="email" label="Email" error={visibleError("email")}>
          <Input
            {...a11y("email")}
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => touch("email")}
          />
        </Field>

        <Field name="description" label="Description" error={visibleError("description")}>
          <Textarea
            {...a11y("description")}
            className="min-h-32"
            maxLength={DESCRIPTION_MAX + 200}
            value={fields.description}
            onChange={(e) => setField("description", e.target.value)}
            onBlur={() => touch("description")}
          />
        </Field>

        {status === "error" && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t publish your listing. Please try again.
          </p>
        )}

        <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={submitting}>
          {submitting ? "Publishing..." : "Publish"}
        </Button>
      </form>

      <section aria-label="Listing preview" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Preview</h2>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
          <ListingImage
            src={photos[0]?.url ?? null}
            alt={fields.title.trim() || "Listing photo preview"}
            aspectClassName="aspect-4/3"
          />
          <div className="min-w-0">
            <p className="text-xl font-bold break-words">{fields.title.trim() || "Title"}</p>
            <p className="text-xl font-bold">{price === null ? "Price" : formatPrice(price)}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Listed just now in {DEFAULT_LOCATION}
            </p>
            <p className="mt-4 text-sm font-medium">Seller information</p>
            <p className="text-sm">{sellerName}</p>
            {fields.description.trim() && (
              <p className="mt-3 text-sm break-words whitespace-pre-line">
                {fields.description.trim()}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
