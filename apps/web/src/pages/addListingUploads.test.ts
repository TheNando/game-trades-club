import { describe, expect, mock, test } from 'bun:test';
import {
  cancelPendingUploads,
  createUploadItems,
  runUploadQueue,
} from './addListingUploads';

describe('runUploadQueue', () => {
  test('uploads sequentially and stops on the first failure', async () => {
    const calls: string[] = [];
    const items = createUploadItems([
      new File(['1'], 'front.png', { type: 'image/png' }),
      new File(['2'], 'back.png', { type: 'image/png' }),
      new File(['3'], 'box.png', { type: 'image/png' }),
    ]);

    const result = await runUploadQueue({
      items,
      listingId: 'listing-1',
      uploadImage: mock(async ({ file }: { file: File }) => {
        calls.push(file.name);
        if (file.name === 'back.png') {
          throw new Error('Unable to upload image.');
        }
      }),
    });

    expect(calls).toEqual(['front.png', 'back.png']);
    expect(result.map((item) => item.status)).toEqual(['uploaded', 'failed', 'pending']);
  });

  test('retries failed items and continues into remaining pending uploads', async () => {
    const calls: string[] = [];
    const items = [
      { file: new File(['1'], 'front.png', { type: 'image/png' }), status: 'uploaded', error: null },
      { file: new File(['2'], 'back.png', { type: 'image/png' }), status: 'failed', error: 'Unable to upload image.' },
      { file: new File(['3'], 'box.png', { type: 'image/png' }), status: 'pending', error: null },
    ] as const;

    const result = await runUploadQueue({
      items: [...items],
      listingId: 'listing-1',
      uploadImage: mock(async ({ file }: { file: File }) => {
        calls.push(file.name);
      }),
    });

    expect(calls).toEqual(['back.png', 'box.png']);
    expect(result.map((item) => item.status)).toEqual(['uploaded', 'uploaded', 'uploaded']);
  });

  test('marks remaining pending items as cancelled', () => {
    const items = createUploadItems([
      new File(['1'], 'front.png', { type: 'image/png' }),
      new File(['2'], 'back.png', { type: 'image/png' }),
    ]);
    items[0] = { ...items[0], status: 'uploaded' };

    expect(cancelPendingUploads(items).map((item) => item.status)).toEqual([
      'uploaded',
      'cancelled',
    ]);
  });
});
