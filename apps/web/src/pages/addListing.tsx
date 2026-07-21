import { useEffect, useState } from 'preact/hooks';
import { formatShopOptionLabel, validateListingImages } from '@game-trades-club/shared';
import type { GameSearchResult, ShopOption } from '@game-trades-club/shared/types';
import {
  cancelPendingUploads,
  createUploadItems,
  runUploadQueue,
  type UploadItem,
} from './addListingUploads';

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

type GamesResponse = {
  items: GameSearchResult[];
};

type ListingResponse = {
  item: {
    id: string;
  };
};

type ShopsResponse = {
  items: ShopOption[];
};

function formatGameLabel(game: GameSearchResult): string {
  return `${game.name} (${game.year ?? 'Unknown'})`;
}

async function uploadListingImage(listingId: string, file: File) {
  const formData = new FormData();
  formData.set('listing_id', listingId);
  formData.append('image', file);

  const response = await fetch('/api/listing-images', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (response.status === 401) {
    throw new Error('You must sign in before uploading images.');
  }

  if (!response.ok) {
    try {
      const errorBody = (await response.json()) as { error?: string };
      throw new Error(errorBody.error ?? 'Unable to upload image.');
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unable to upload image.');
    }
  }
}

/** Renders the authenticated form for creating a listing. */
export function AddListing() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('good');
  const [price, setPrice] = useState('');

  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState<GameSearchResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameSearchResult | null>(null);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gameError, setGameError] = useState('');

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [uploadFlowCancelled, setUploadFlowCancelled] = useState(false);

  const [shops, setShops] = useState<ShopOption[]>([]);
  const [preferredShopId, setPreferredShopId] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [creatingListing, setCreatingListing] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include' });
        if (!response.ok) {
          if (isMounted) setUser(null);
          return;
        }

        const data = (await response.json()) as CurrentUser;
        if (isMounted) setUser(data);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoadingUser(false);
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch('/api/shops', { credentials: 'include' });
        if (!response.ok) return;
        const data = (await response.json()) as ShopsResponse;
        if (isMounted) setShops(data.items ?? []);
      } catch {
        // non-fatal: the picker stays empty
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const query = gameQuery.trim();
    setGameError('');

    if (query.length < 2) {
      setGameResults([]);
      setLoadingGames(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingGames(true);
      try {
        const response = await fetch(`/api/games?q=${encodeURIComponent(query)}&limit=25`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          setGameError('Unable to load games right now.');
          setGameResults([]);
          return;
        }

        const data = (await response.json()) as GamesResponse;
        setGameResults(data.items ?? []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setGameError('Unable to load games right now.');
          setGameResults([]);
        }
      } finally {
        setLoadingGames(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [gameQuery]);

  useEffect(() => {
    if (selectedGame) return;

    const gameId = Number.parseInt(gameQuery, 10);
    if (!Number.isInteger(gameId)) return;

    const matchedGame = gameResults.find((game) => game.id === gameId);
    if (!matchedGame) return;

    setSelectedGame(matchedGame);
  }, [gameQuery, gameResults, selectedGame]);

  const selectGame = (game: GameSearchResult) => {
    setSelectedGame(game);
    setGameQuery(formatGameLabel(game));
    setGameResults([]);
    setGameError('');
  };

  const startGoogleAuth = () => {
    window.location.href = '/api/auth/google/start';
  };

  const resetForm = () => {
    setDescription('');
    setCondition('good');
    setPrice('');
    setGameQuery('');
    setGameResults([]);
    setSelectedGame(null);
    setSelectedFiles([]);
    setUploadItems([]);
    setCreatedListingId(null);
    setUploadFlowCancelled(false);
    setPreferredShopId('');
  };

  const handleFileChange = (event: Event) => {
    const files = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
    const validation = validateListingImages(files);

    if (!validation.ok) {
      setSelectedFiles([]);
      setUploadItems([]);
      setSubmitError('message' in validation ? validation.message : 'Invalid images');
      return;
    }

    setSubmitError('');
    setSelectedFiles(files);
    setUploadItems(createUploadItems(files));
  };

  const submitListing = async (event: Event) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setUploadFlowCancelled(false);

    if (!selectedGame) {
      setSubmitError('Select a game from the search results first.');
      return;
    }

    const normalizedPrice = price.trim();
    if (!/^\d+$/.test(normalizedPrice)) {
      setSubmitError('Enter price in dollars.');
      return;
    }

    const validation = validateListingImages(selectedFiles);
    if (!validation.ok) {
      setSubmitError('message' in validation ? validation.message : 'Invalid images');
      return;
    }

    setCreatingListing(true);

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          game_id: String(selectedGame.id),
          condition,
          price: normalizedPrice,
          status: 'open',
          preferred_shop_id: preferredShopId || null,
        }),
      });

      if (response.status === 401) {
        setUser(null);
        setSubmitError('You must sign in before creating a listing.');
        return;
      }

      if (!response.ok) {
        try {
          const errorBody = (await response.json()) as { error?: string };
          setSubmitError(errorBody.error ?? 'Unable to create listing.');
        } catch {
          setSubmitError('Unable to create listing.');
        }
        return;
      }

      const body = (await response.json()) as ListingResponse;
      setCreatedListingId(body.item.id);

      if (selectedFiles.length === 0) {
        resetForm();
        setSubmitSuccess('Listing created successfully.');
        return;
      }

      setUploadingImages(true);
      const nextItems = createUploadItems(selectedFiles);
      setUploadItems(nextItems);

      const result = await runUploadQueue({
        items: nextItems,
        listingId: body.item.id,
        uploadImage: ({ listingId, file }) => uploadListingImage(listingId, file),
        onItemsChange: setUploadItems,
      });

      setUploadItems(result);

      if (result.some((item) => item.status === 'failed')) {
        setUploadFlowCancelled(false);
        setSubmitError('Listing created. Some images still need attention.');
        return;
      }

      resetForm();
      setSubmitSuccess('Listing and images created successfully.');
    } catch {
      setSubmitError('Unable to create listing.');
    } finally {
      setCreatingListing(false);
      setUploadingImages(false);
    }
  };

  const retryFailedUploads = async () => {
    if (!createdListingId) return;

    setSubmitError('');
    setSubmitSuccess('');
    setUploadFlowCancelled(false);
    setUploadingImages(true);

    try {
      const result = await runUploadQueue({
        items: uploadItems,
        listingId: createdListingId,
        uploadImage: ({ listingId, file }) => uploadListingImage(listingId, file),
        onItemsChange: setUploadItems,
      });

      setUploadItems(result);

      if (result.some((item) => item.status === 'failed')) {
        setUploadFlowCancelled(false);
        setSubmitError('Listing created. Some images still need attention.');
        return;
      }

      resetForm();
      setSubmitSuccess('Listing and images created successfully.');
    } finally {
      setUploadingImages(false);
    }
  };

  const cancelRemainingUploads = () => {
    setUploadItems((items) => cancelPendingUploads(items));
    setUploadFlowCancelled(true);
    setSubmitError('');
    setSubmitSuccess('Listing created. Remaining image uploads cancelled.');
  };

  const uploadedCount = uploadItems.filter((item) => item.status === 'uploaded').length;
  const totalUploads = uploadItems.length;
  const hasFailedUpload =
    uploadItems.some((item) => item.status === 'failed') && !uploadFlowCancelled;
  const isSubmitting = creatingListing || uploadingImages;

  return (
    <div class="min-h-screen bg-base-100 text-base-content">
      <section class="relative overflow-hidden border-b border-base-300 bg-base-200 bg-paper">
        <div class="absolute inset-0 bg-dotgrid opacity-[0.25] pointer-events-none" />
        <div class="relative z-10 max-w-3xl mx-auto px-4 md:px-8 pt-14 pb-10">
          <p class="text-xs uppercase tracking-[0.22em] text-primary/80 font-semibold">
            New listing
          </p>
          <h1 class="font-display text-4xl md:text-5xl font-medium mt-2 leading-tight">
            Add A Listing
          </h1>
          <p class="mt-3 text-base-content/70 max-w-xl">
            Choose your game, add pricing and images, and publish your listing — a neighbor is
            probably looking for it already.
          </p>
        </div>
      </section>

      <section class="max-w-3xl mx-auto px-4 md:px-8 py-10">
        {loadingUser ? (
          <div class="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-base-content/75">
            <span>Checking your sign-in status...</span>
          </div>
        ) : !user ? (
          <div class="rounded-2xl border border-base-300 bg-base-200/60 p-8 shadow-sm">
            <h2 class="font-display text-2xl">Sign in required</h2>
            <p class="mt-2 text-base-content/70">
              You need to sign in with Google before creating a listing.
            </p>
            <div class="mt-6 flex justify-end">
              <button type="button" class="btn btn-primary rounded-xl" onClick={startGoogleAuth}>
                Sign in with Google
              </button>
            </div>
          </div>
        ) : (
          <form
            class="rounded-2xl border border-base-300 bg-base-100 shadow-sm"
            onSubmit={submitListing}
          >
            <div class="p-6 md:p-8 flex flex-col gap-5">
              <fieldset class="fieldset flex flex-col gap-5">
                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-medium" for="listing-game">
                    Game
                  </label>
                  <input
                    id="listing-game"
                    aria-label="Game"
                    list="game-list"
                    class="input input-bordered rounded-xl"
                    type="text"
                    required
                    placeholder="Search game names (min 2 characters)"
                    value={selectedGame ? formatGameLabel(selectedGame) : gameQuery}
                    onInput={(event) => {
                      const nextValue = (event.currentTarget as HTMLInputElement).value;
                      const gameId = Number.parseInt(nextValue, 10);
                      const game = gameResults.find((item) => item.id === gameId);

                      if (game) {
                        selectGame(game);
                        return;
                      }

                      setGameQuery(nextValue);
                      setSelectedGame(null);
                    }}
                  />
                  <p class="text-xs text-base-content/60">
                    {selectedGame ? 'Game selected' : 'Search and choose one result.'}
                  </p>
                  <datalist id="game-list">
                    {loadingGames ? (
                      <option value="_loading">Searching games...</option>
                    ) : gameError ? (
                      <option value="_error">{gameError}</option>
                    ) : gameResults.length === 0 ? (
                      <option value="_empty">No games found.</option>
                    ) : (
                      gameResults.map((game) => (
                        <option key={game.id} value={game.id} label={formatGameLabel(game)} />
                      ))
                    )}
                  </datalist>
                </div>

                <div class="grid sm:grid-cols-2 gap-5">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium" for="listing-condition">
                      Condition
                    </label>
                    <select
                      id="listing-condition"
                      aria-label="Condition"
                      class="select select-bordered rounded-xl"
                      value={condition}
                      onInput={(event) =>
                        setCondition((event.currentTarget as HTMLSelectElement).value)
                      }
                    >
                      <option value="new">New</option>
                      <option value="like_new">Like New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium" for="listing-price">
                      Price ($)
                    </label>
                    <input
                      id="listing-price"
                      aria-label="Price ($)"
                      class="input input-bordered rounded-xl"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      required
                      placeholder="25"
                      value={price}
                      onInput={(event) => setPrice((event.currentTarget as HTMLInputElement).value)}
                    />
                  </div>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-medium" for="listing-description">
                    Description
                  </label>
                  <textarea
                    id="listing-description"
                    aria-label="Description"
                    class="textarea textarea-bordered rounded-xl min-h-32"
                    maxLength={1200}
                    placeholder="Include box condition, missing pieces, edition notes, and meetup preferences."
                    value={description}
                    onInput={(event) =>
                      setDescription((event.currentTarget as HTMLTextAreaElement).value)
                    }
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-medium" for="listing-shop">
                    Preferred meetup shop
                  </label>
                  <select
                    id="listing-shop"
                    aria-label="Preferred meetup shop"
                    class="select select-bordered rounded-xl"
                    value={preferredShopId}
                    onInput={(event) =>
                      setPreferredShopId((event.currentTarget as HTMLSelectElement).value)
                    }
                  >
                    <option value="">No preference</option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {formatShopOptionLabel(shop)}
                      </option>
                    ))}
                  </select>
                  <p class="text-xs text-base-content/60">
                    Optional. Pick a game store where you'd be happy to meet for the hand-off.
                  </p>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-medium" for="listing-images">
                    Images
                  </label>
                  <input
                    id="listing-images"
                    aria-label="Images"
                    class="file-input file-input-bordered rounded-xl"
                    type="file"
                    multiple
                    accept=".webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg"
                    onChange={handleFileChange}
                  />
                  <p class="text-xs text-base-content/60">
                    Add up to 3 images in webp, png, or jpg format.
                  </p>
                </div>
              </fieldset>

              {creatingListing ? (
                <div class="rounded-xl border border-base-300 bg-base-200/60 p-3 text-sm">
                  <span>Creating listing...</span>
                </div>
              ) : null}

              {totalUploads > 0 ? (
                <div class="rounded-xl border border-base-300 bg-base-200/40 p-4">
                  <h2 class="font-display text-lg">Image uploads</h2>
                  <p class="text-sm text-base-content/70 mt-1">
                    {uploadedCount} of {totalUploads} uploaded
                  </p>
                  <ul class="mt-3 space-y-2">
                    {uploadItems.map((item) => (
                      <li
                        key={item.file.name}
                        class="flex items-center justify-between gap-3 text-sm border-t border-base-300/70 pt-2 first:border-0 first:pt-0"
                      >
                        <span class="truncate">{item.file.name}</span>
                        <span class="capitalize text-base-content/65">{item.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {submitError ? (
                <div class="alert alert-error rounded-xl">
                  <span>{submitError}</span>
                </div>
              ) : null}

              {submitSuccess ? (
                <div class="alert alert-success rounded-xl">
                  <span>{submitSuccess}</span>
                </div>
              ) : null}

              {hasFailedUpload ? (
                <div class="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    class="btn btn-outline rounded-xl"
                    onClick={retryFailedUploads}
                    disabled={uploadingImages}
                  >
                    Retry failed uploads
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost rounded-xl"
                    onClick={cancelRemainingUploads}
                    disabled={uploadingImages}
                  >
                    Cancel remaining uploads
                  </button>
                </div>
              ) : null}

              <div class="flex items-center justify-between pt-2 border-t border-base-300">
                <p class="text-xs text-base-content/55">Free to list · No shipping fees</p>
                <button type="submit" class="btn btn-primary rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? 'Publishing...' : 'Publish listing'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      <footer class="border-t border-base-300 bg-base-200/60 mt-10">
        <div class="max-w-6xl mx-auto px-4 md:px-8 py-8 text-sm text-base-content/60">
          © {new Date().getFullYear()} Game Trades Club · Made for tabletop people.
        </div>
      </footer>
    </div>
  );
}
