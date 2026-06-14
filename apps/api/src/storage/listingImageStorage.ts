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

const THUMB_MAX_DIMENSION = 200;
const THUMB_WEBP_QUALITY = 78;

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

type SavedListingImage = {
  absolutePath: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  thumbStoredFilename: string | null;
  thumbAbsolutePath: string | null;
  width: number | null;
  height: number | null;
};

async function writeThumbnail(uploadDir: string, sourcePath: string, baseId: string) {
  const thumbStoredFilename = `${baseId}_thumb.webp`;
  const thumbAbsolutePath = join(uploadDir, thumbStoredFilename);

  const pipeline = Bun.file(sourcePath)
    .image()
    .resize(THUMB_MAX_DIMENSION, THUMB_MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: THUMB_WEBP_QUALITY });

  await pipeline.write(thumbAbsolutePath);
  return {
    thumbStoredFilename,
    thumbAbsolutePath,
    width: pipeline.width,
    height: pipeline.height,
  };
}

export async function saveListingImage(
  uploadDir: string,
  file: File
): Promise<SavedListingImage> {
  const imageDetails = getListingImageDetails(file);
  if (!imageDetails) throw new Error('Unsupported image type');

  const baseId = crypto.randomUUID();
  const storedFilename = `${baseId}${imageDetails.extension}`;
  await mkdir(uploadDir, { recursive: true });

  const absolutePath = join(uploadDir, storedFilename);
  await Bun.write(absolutePath, file);

  let thumb: Awaited<ReturnType<typeof writeThumbnail>> | null = null;
  try {
    thumb = await writeThumbnail(uploadDir, absolutePath, baseId);
  } catch (error) {
    console.error('Unable to generate thumbnail for listing image', error);
    await rm(join(uploadDir, `${baseId}_thumb.webp`), { force: true });
  }

  return {
    absolutePath,
    originalFilename: file.name,
    storedFilename,
    mimeType: imageDetails.mimeType,
    thumbStoredFilename: thumb?.thumbStoredFilename ?? null,
    thumbAbsolutePath: thumb?.thumbAbsolutePath ?? null,
    width: thumb?.width ?? null,
    height: thumb?.height ?? null,
  };
}

export async function removeListingImageFile(absolutePath: string) {
  await rm(absolutePath, { force: true });
}
