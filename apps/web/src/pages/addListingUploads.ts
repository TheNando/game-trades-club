type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed' | 'cancelled';

export type UploadItem = {
  file: File;
  status: UploadStatus;
  error: string | null;
};

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
