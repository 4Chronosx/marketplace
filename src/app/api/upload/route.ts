import { handleRouteError, jsonError } from "@/lib/api";
import { dbUploadListingImage } from "@/lib/db";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MB,
  detectImageType,
} from "@/lib/listing-validation";

// POST /api/upload  multipart/form-data with one image in the "file" field.
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Expected multipart form data.");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError(400, 'Attach an image in the "file" field.');
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return jsonError(413, `Image must be ${MAX_PHOTO_MB} MB or smaller.`);
  }

  // Trust the file's bytes, not its declared type or name.
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const image = detectImageType(header);
  if (!image) {
    return jsonError(415, "Only JPEG, PNG, WebP or GIF images are allowed.");
  }

  try {
    const uploaded = await dbUploadListingImage(file, image);
    return Response.json(uploaded, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
