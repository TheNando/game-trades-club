import { mkdir, rm, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { getDataPath } from '../utils/paths';

const THUMB_MAX_DIMENSION = 200;
const THUMB_WEBP_QUALITY = 78;

const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const extensionByMime = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const mimeTypeByExtension = new Map<string, string>([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

/** Returns the directory used for cached BoardGameGeek images. */
export function getGameImageStorageDir() {
  return join(getDataPath(), 'game-images');
}

/** Identifies stored original and thumbnail image paths. */
export type GameImagePaths = {
  originalFilename: string;
  originalAbsolutePath: string;
  thumbFilename: string;
  thumbAbsolutePath: string;
};

/** Identifies an existing cached game image and thumbnail. */
export type FoundGameImage = {
  originalFilename: string;
  mimeType: string;
  thumbFilename: string | null;
};

function pickExtension(contentType: string | null | undefined, imageUrl: string): string | null {
  if (contentType) {
    const ext = extensionByMime.get(contentType.split(';')[0]?.trim().toLowerCase() ?? '');
    if (ext) return ext;
  }
  try {
    const pathname = new URL(imageUrl).pathname;
    const fromUrl = extname(pathname).toLowerCase();
    if (supportedExtensions.has(fromUrl)) {
      return fromUrl === '.jpeg' ? '.jpg' : fromUrl;
    }
  } catch {
    // fall through
  }
  return null;
}

type EnsureBggGameImageOptions = {
  fetchFn?: (input: string, init?: RequestInit) => Promise<Response>;
  storageDir?: string;
};

/** Downloads a BoardGameGeek image and generates its thumbnail. */
export async function ensureBggGameImage(
  gameId: number,
  imageUrl: string,
  { fetchFn = fetch, storageDir = getGameImageStorageDir() }: EnsureBggGameImageOptions = {},
): Promise<GameImagePaths | null> {
  const response = await fetchFn(imageUrl);
  if (!response.ok) return null;

  const extension = pickExtension(response.headers.get('content-type'), imageUrl);
  if (!extension) return null;

  await mkdir(storageDir, { recursive: true });

  const originalFilename = `${gameId}${extension}`;
  const originalAbsolutePath = join(storageDir, originalFilename);
  const buffer = new Uint8Array(await response.arrayBuffer());
  await Bun.write(originalAbsolutePath, buffer);

  const thumbFilename = `thumb_${gameId}.webp`;
  const thumbAbsolutePath = join(storageDir, thumbFilename);

  try {
    await Bun.file(originalAbsolutePath)
      .image()
      .resize(THUMB_MAX_DIMENSION, THUMB_MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: THUMB_WEBP_QUALITY })
      .write(thumbAbsolutePath);
  } catch (error) {
    console.error('Unable to generate thumbnail for BGG game image', error);
    await rm(thumbAbsolutePath, { force: true });
    return null;
  }

  return {
    originalFilename,
    originalAbsolutePath,
    thumbFilename,
    thumbAbsolutePath,
  };
}

/** Finds a cached game image and its optional thumbnail. */
export async function findGameImage(
  gameId: number,
  storageDir = getGameImageStorageDir(),
): Promise<FoundGameImage | null> {
  for (const extension of ['.jpg', '.png', '.webp']) {
    const originalFilename = `${gameId}${extension}`;
    try {
      await stat(join(storageDir, originalFilename));
    } catch {
      continue;
    }
    const mimeType = mimeTypeByExtension.get(extension)!;
    const thumbFilename = `thumb_${gameId}.webp`;
    try {
      await stat(join(storageDir, thumbFilename));
      return { originalFilename, mimeType, thumbFilename };
    } catch {
      return { originalFilename, mimeType, thumbFilename: null };
    }
  }
  return null;
}
