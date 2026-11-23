import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ListingImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  /** Tailwind aspect-ratio class; defaults to a square tile. */
  aspectClassName?: string;
};

// Square image tile. With no photo it shows a brand-tinted placeholder. Remote
// `src` values must match `images.remotePatterns` in next.config.ts (Supabase
// Storage is configured there).
export function ListingImage({
  src,
  alt,
  className,
  aspectClassName = "aspect-square",
}: ListingImageProps) {
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-xl bg-brand/10 text-brand/40",
        aspectClassName,
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw"
          className="object-cover"
        />
      ) : (
        <ImageIcon aria-hidden="true" className="h-auto w-1/4" strokeWidth={1.5} />
      )}
    </div>
  );
}
