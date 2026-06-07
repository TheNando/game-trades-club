import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { AddListing } from './addListing';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('<AddListing />', () => {
  beforeEach(() => {
    let uploadAttempts = 0;

    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/me') {
        return jsonResponse({
          id: 'user-1',
          email: 'user@example.com',
          name: 'User',
          avatarUrl: null,
        });
      }

      if (url.startsWith('/api/games')) {
        return jsonResponse({
          items: [{ id: 1, name: 'Catan', year: 1995 }],
        });
      }

      if (url === '/api/shops') {
        return jsonResponse({ items: [] });
      }

      if (url === '/api/listings') {
        return jsonResponse({
          item: {
            id: 'listing-1',
            user_id: 'user-1',
            description: 'Nice copy',
            game: { id: 1, name: 'Catan' },
            cover_image: null,
            condition: 'good',
            price: 25,
            status: 'open',
          },
        }, { status: 201 });
      }

      if (url === '/api/listing-images') {
        uploadAttempts += 1;

        if (uploadAttempts === 1) {
          return jsonResponse({
            item: {
              id: 'image-1',
              listing_id: 'listing-1',
              owner_id: 'user-1',
              original_filename: 'front.png',
              stored_filename: 'guid-front.png',
              mime_type: 'image/png',
              created_at: '2026-03-26 00:00:00',
            },
          }, { status: 201 });
        }

        return jsonResponse({ error: 'Unable to upload image.' }, { status: 500 });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    }) as never;
  });

  afterEach(() => {
    cleanup();
  });

  test('shows a validation error when more than three files are selected', async () => {
    render(<AddListing />);
    await screen.findByText('Add A Listing');

    const input = screen.getByLabelText('Images') as HTMLInputElement;
    const files = [
      new File(['1'], 'one.png', { type: 'image/png' }),
      new File(['2'], 'two.png', { type: 'image/png' }),
      new File(['3'], 'three.png', { type: 'image/png' }),
      new File(['4'], 'four.png', { type: 'image/png' }),
    ];

    fireEvent.change(input, { target: { files } });

    expect(screen.getByText('You can upload up to 3 images.')).not.toBeNull();
  });

  test('creates the listing before uploading images and exposes retry/cancel controls after a partial failure', async () => {
    render(<AddListing />);
    await screen.findByText('Add A Listing');

    fireEvent.input(screen.getByLabelText('Game'), { target: { value: 'Ca' } });

    await waitFor(() => {
      expect(
        document.querySelector('#game-list option[label^="Catan"]')
      ).not.toBeNull();
    });

    fireEvent.input(screen.getByLabelText('Game'), { target: { value: '1' } });
    fireEvent.input(screen.getByLabelText('Price ($)'), { target: { value: '25' } });

    const fileInput = screen.getByLabelText('Images') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['front'], 'front.png', { type: 'image/png' }),
          new File(['back'], 'back.png', { type: 'image/png' }),
        ],
      },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Publish listing' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('1 of 2 uploaded')).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Retry failed uploads' })).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Cancel remaining uploads' })).not.toBeNull();
    });
  });

  test('hides retry controls after cancelling remaining uploads', async () => {
    render(<AddListing />);
    await screen.findByText('Add A Listing');

    fireEvent.input(screen.getByLabelText('Game'), { target: { value: 'Ca' } });

    await waitFor(() => {
      expect(
        document.querySelector('#game-list option[label^="Catan"]')
      ).not.toBeNull();
    });

    fireEvent.input(screen.getByLabelText('Game'), { target: { value: '1' } });
    fireEvent.input(screen.getByLabelText('Price ($)'), { target: { value: '25' } });

    const fileInput = screen.getByLabelText('Images') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['front'], 'front.png', { type: 'image/png' }),
          new File(['back'], 'back.png', { type: 'image/png' }),
        ],
      },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Publish listing' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel remaining uploads' })).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel remaining uploads' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Retry failed uploads' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Cancel remaining uploads' })).toBeNull();
      expect(screen.getByText('Listing created. Remaining image uploads cancelled.')).not.toBeNull();
    });
  });
});
