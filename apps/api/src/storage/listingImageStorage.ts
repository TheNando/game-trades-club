import { mkdir, rm } from 'node:fs/promises';
import { extname } from 'node:path';
import { join } from 'node:path';

const supportedImageExtensions = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const supportedImageMimeTypesByExtension = new Map<string, string>([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

export function getListingImageUploadDir() {
  return process.env.LISTING_IMAGE_UPLOAD_DIR ?? './data/listing-images';
}

export function isSupportedListingImage(file: File) {
  return getListingImageDetails(file) !== null;
}

function getListingImageDetails(file: File) {
  if (supportedImageExtensions.has(file.type)) {
    return {
      extension: supportedImageExtensions.get(file.type)!,
      mimeType: file.type,
    };
  }

  const extension = extname(file.name).toLowerCase();
  const mimeType = supportedImageMimeTypesByExtension.get(extension);
  if (!mimeType) return null;

  return {
    extension: mimeType === 'image/jpeg' ? '.jpg' : extension,
    mimeType,
  };
}

export async function saveListingImage(uploadDir: string, file: File) {
  const imageDetails = getListingImageDetails(file);
  if (!imageDetails) throw new Error('Unsupported image type');

  const storedFilename = `${crypto.randomUUID()}${imageDetails.extension}`;
  await mkdir(uploadDir, { recursive: true });

  const absolutePath = join(uploadDir, storedFilename);
  await Bun.write(absolutePath, file);

  return {
    absolutePath,
    originalFilename: file.name,
    storedFilename,
    mimeType: imageDetails.mimeType,
  };
}

export async function removeListingImageFile(absolutePath: string) {
  await rm(absolutePath, { force: true });
}
