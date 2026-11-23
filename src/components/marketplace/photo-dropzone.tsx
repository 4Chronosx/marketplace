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
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from "@/lib/listing-validation";

export type Photo = { id: string; file: File; url: string };

type PhotoDropzoneProps = {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
};

export function PhotoDropzone({ photos, onChange }: PhotoDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Object URLs created here are revoked on removal and on unmount.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    return () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
  }, []);

  function addFiles(list: FileList | File[]) {
    const problems: string[] = [];
    const accepted: Photo[] = [];
    let slots = MAX_PHOTOS - photos.length;

    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/")) {
        problems.push(`${file.name} isn't an image.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        problems.push(`${file.name} is larger than 5 MB.`);
        continue;
      }
      if (slots <= 0) {
        problems.push(`You can add up to ${MAX_PHOTOS} photos.`);
        break;
      }
      accepted.push({
        id: Math.random().toString(36).slice(2),
        file,
        url: URL.createObjectURL(file),
      });
      slots -= 1;
    }

    setMessage(problems.length > 0 ? problems.join(" ") : null);
    if (accepted.length > 0) onChange([...photos, ...accepted]);
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

  function remove(id: string) {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    setMessage(null);
    onChange(photos.filter((p) => p.id !== id));
  }

  const full = photos.length >= MAX_PHOTOS;

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
          full && "cursor-not-allowed opacity-60",
        )}
      >
        <ImagePlusIcon aria-hidden="true" className="size-8 text-muted-foreground" />
        <span className="text-base font-medium">Add photos</span>
        <span className="text-sm text-muted-foreground">
          Drag and drop, or click to browse. Up to {MAX_PHOTOS} images, 5 MB each.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={full}
          onChange={onInputChange}
          className="sr-only"
        />
      </label>

      {message && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {message}
        </p>
      )}

      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative">
              <div className="relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                    Cover
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => remove(photo.id)}
                className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <XIcon aria-hidden="true" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
