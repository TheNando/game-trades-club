import { BunRequest } from 'bun';
import { join } from 'node:path';
import {
  findGameImage,
  getGameImageStorageDir,
} from '../storage/gameImageStorage';
import { RouteDependencies } from '../middleware/dependencies';
import { notFound } from '../utils/http';

type FindGameImageFn = typeof findGameImage;

type CreateGetGameImageOptions = {
  findGameImageFn?: FindGameImageFn;
  storageDir?: string;
};

const IMMUTABLE_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function matchGameImageId(url: URL) {
  return url.pathname.match(/^\/api\/game-images\/([^/]+)$/)?.[1];
}

export function createGetGameImage({
  findGameImageFn = findGameImage,
  storageDir = getGameImageStorageDir(),
}: CreateGetGameImageOptions = {}) {
  return async function getGameImage(
    _: BunRequest<'/api/game-images/:id'>,
    { url }: RouteDependencies
  ) {
    const idParam = matchGameImageId(url);
    if (!idParam || !/^\d+$/.test(idParam)) return notFound('Image not found');

    const gameId = Number.parseInt(idParam, 10);
    const image = await findGameImageFn(gameId, storageDir);
    if (!image) return notFound('Image not found');

    const variant = url.searchParams.get('variant');
    const wantsThumb = variant === 'thumb' && image.thumbFilename !== null;
    const storedFilename = wantsThumb ? image.thumbFilename! : image.originalFilename;
    const contentType = wantsThumb ? 'image/webp' : image.mimeType;

    const file = Bun.file(join(storageDir, storedFilename));
    if (!(await file.exists())) return notFound('Image not found');

    return new Response(file.stream(), {
      headers: {
        'content-type': contentType,
        'cache-control': IMMUTABLE_IMAGE_CACHE_CONTROL,
      },
    });
  };
}

export const getGameImage = createGetGameImage();
