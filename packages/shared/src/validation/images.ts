import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  MAX_LISTING_IMAGES,
} from '../constants/images';

function hasSupportedExtension(fileName: string): boolean {
  const lowerCaseName = fileName.toLowerCase();
  return [...ALLOWED_IMAGE_EXTENSIONS].some((extension) => lowerCaseName.endsWith(extension));
}

/** Determines whether an image has a supported MIME type or file extension. */
export function isValidImageType(file: { type: string; name: string; }): boolean {
  return ALLOWED_IMAGE_TYPES.has(file.type) || hasSupportedExtension(file.name);
}

/** Validates a listing image collection's size and file types. */
export function validateListingImages(
  files: { type: string; name: string; }[],
): { ok: true; } | { ok: false; message: string; } {
  if (files.length > MAX_LISTING_IMAGES) {
    return { ok: false, message: `You can upload up to ${MAX_LISTING_IMAGES} images.` };
  }

  if (files.some((file) => !isValidImageType(file))) {
    return { ok: false, message: 'Images must be webp, png, or jpg.' };
  }

  return { ok: true };
}
