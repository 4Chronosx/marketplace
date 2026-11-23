"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import Image from "next/image";
import { ImagePlusIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALLOWED_IMAGE_MIME,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MB,
} from "@/lib/listing-validation";

export type Photo = { id: string; file: File; url: string };

type PhotoDropzoneProps = {
  /** Zero or one photo: a listing has a single image. */
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
};

export function PhotoDropzone({ photos, onChange }: PhotoDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const photo = photos[0];

  // Object URLs created here are revoked on replace, removal and unmount.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);

  function addFiles(list: FileList | File[]) {
    const problems: string[] = [];
    let chosen: Photo | null = null;

    for (const file of Array.from(list)) {
      if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
        problems.push(`${file.name} isn't a JPEG, PNG, WebP or GIF image.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        problems.push(`${file.name} is larger than ${MAX_PHOTO_MB} MB.`);
        continue;
      }
      if (chosen) {
        problems.push("Only one photo per listing, so the first one was used.");
        break;
      }
      chosen = {
        id: Math.random().toString(36).slice(2),
        file,
        url: URL.createObjectURL(file),
      };
    }

    setMessage(problems.length > 0 ? problems.join(" ") : null);
    if (chosen) {
      // A new photo replaces the current one.
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      onChange([chosen]);
    }
  }

  function onDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }

  function onDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    // Allow picking the same file again after removing it.
    event.target.value = "";
  }

  function remove() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setMessage(null);
    onChange([]);
  }

  return (
    <div>
      <label
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed bg-muted/40 px-4 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted",
          dragging && "border-brand bg-brand/10",
        )}
      >
        <ImagePlusIcon aria-hidden="true" className="size-8 text-muted-foreground" />
        <span className="text-base font-medium">
          {photo ? "Replace photo" : "Add a photo"}
        </span>
        <span className="text-sm text-muted-foreground">
          Drag and drop, or click to browse. One image, up to {MAX_PHOTO_MB} MB (JPEG, PNG, WebP or GIF).
        </span>
        <input
          type="file"
          accept={ALLOWED_IMAGE_MIME.join(",")}
          onChange={onInputChange}
          className="sr-only"
        />
      </label>

      {message && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {message}
        </p>
      )}

      {photo && (
        <div className="relative mt-3 size-24">
          <div className="relative size-24 overflow-hidden rounded-lg">
            <Image
              src={photo.url}
              alt="Selected photo"
              fill
              unoptimized
              sizes="96px"
              className="object-contain"
            />
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
              Cover
            </span>
          </div>
          <button
            type="button"
            aria-label="Remove photo"
            onClick={remove}
            className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <XIcon aria-hidden="true" className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}
