export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed' | 'cancelled';

export type UploadItem = {
  file: File;
  status: UploadStatus;
  error: string | null;
};

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function hasSupportedExtension(fileName: string) {
  const lowerCaseName = fileName.toLowerCase();
  return [...allowedImageExtensions].some((extension) => lowerCaseName.endsWith(extension));
}

export function validateSelectedImages(files: File[]) {
  if (files.length > 3) {
    return { ok: false as const, message: 'You can upload up to 3 images.' };
  }

  if (files.some((file) => !allowedImageTypes.has(file.type) && !hasSupportedExtension(file.name))) {
    return { ok: false as const, message: 'Images must be webp, png, or jpg.' };
  }

  return { ok: true as const };
}

export function createUploadItems(files: File[]): UploadItem[] {
  return files.map((file) => ({
    file,
    status: 'pending',
    error: null,
  }));
}

export async function runUploadQueue({
  items,
  listingId,
  uploadImage,
  onItemsChange,
}: {
  items: UploadItem[];
  listingId: string;
  uploadImage: (args: { listingId: string; file: File }) => Promise<void>;
  onItemsChange?: (items: UploadItem[]) => void;
}) {
  const nextItems = [...items];

  for (let index = 0; index < nextItems.length; index += 1) {
    const current = nextItems[index];
    if (current.status !== 'pending' && current.status !== 'failed') continue;

    nextItems[index] = {
      ...current,
      status: 'uploading',
      error: null,
    };
    onItemsChange?.([...nextItems]);

    try {
      await uploadImage({ listingId, file: current.file });
      nextItems[index] = {
        ...nextItems[index],
        status: 'uploaded',
      };
      onItemsChange?.([...nextItems]);
    } catch (error) {
      nextItems[index] = {
        ...nextItems[index],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unable to upload image.',
      };
      onItemsChange?.([...nextItems]);
      break;
    }
  }

  return nextItems;
}

export function cancelPendingUploads(items: UploadItem[]) {
  return items.map((item) =>
    item.status === 'pending' ? { ...item, status: 'cancelled' as const } : item
  );
}
