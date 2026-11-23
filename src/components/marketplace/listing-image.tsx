import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ListingImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  /** Tailwind aspect-ratio class; defaults to a square tile. */
  aspectClassName?: string;
  /** `sizes` hint for next/image; defaults to the browse grid's column widths. */
  sizes?: string;
  /** "contain" shows the whole photo; "cover" fills the tile and crops the edges. */
  fit?: "contain" | "cover";
};

// Matches LISTING_GRID_CLASSNAME: 1 column on phones, then 2 / 3 / 4 / 5.
const GRID_SIZES =
  "(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

// Image tile. By default the whole photo is shown (object-contain, never
// cropped) and spare space is the brand-tinted background; grid cards pass
// fit="cover" to fill the tile instead. With no photo it shows a brand-tinted placeholder. Remote
// `src` values must match `images.remotePatterns` in next.config.ts (Supabase
// Storage is configured there).
export function ListingImage({
  src,
  alt,
  className,
  aspectClassName = "aspect-square",
  sizes = GRID_SIZES,
  fit = "contain",
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
          sizes={sizes}
          className={fit === "cover" ? "object-cover" : "object-contain"}
        />
      ) : (
        <ImageIcon aria-hidden="true" className="h-auto w-1/4" strokeWidth={1.5} />
      )}
    </div>
  );
}
