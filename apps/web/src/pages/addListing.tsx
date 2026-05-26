import { useEffect, useState } from 'preact/hooks';
import {
	cancelPendingUploads,
	createUploadItems,
	runUploadQueue,
	type UploadItem,
	validateSelectedImages,
} from './addListingUploads';

type CurrentUser = {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
};

type GameSearchResult = {
	id: number;
	name: string;
	year: number | null;
};

type GamesResponse = {
	items: GameSearchResult[];
};

type ListingResponse = {
	item: {
		id: string;
	};
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
			const errorBody = (await response.json()) as { error?: string; };
			throw new Error(errorBody.error ?? 'Unable to upload image.');
		} catch (error) {
			throw error instanceof Error ? error : new Error('Unable to upload image.');
		}
	}
}

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
				const response = await fetch(
					`/api/games?q=${encodeURIComponent(query)}&limit=25`,
					{
						credentials: 'include',
						signal: controller.signal,
					}
				);

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
	};

	const handleFileChange = (event: Event) => {
		const files = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
		const validation = validateSelectedImages(files);

		if (!validation.ok) {
			setSelectedFiles([]);
			setUploadItems([]);
			setSubmitError(validation.message);
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

		const validation = validateSelectedImages(selectedFiles);
		if (!validation.ok) {
			setSubmitError(validation.message);
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
				}),
			});

			if (response.status === 401) {
				setUser(null);
				setSubmitError('You must sign in before creating a listing.');
				return;
			}

			if (!response.ok) {
				try {
					const errorBody = (await response.json()) as { error?: string; };
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
		<div class="min-h-screen bg-base-100 font-sans">
			<section class="max-w-3xl mx-auto px-4 py-10">
				<div class="mb-8">
					<h1 class="text-3xl font-bold">Add A Listing</h1>
					<p class="text-base-content/70 mt-2">
						Choose your game, add pricing and images, and publish your listing.
					</p>
				</div>

				{loadingUser ? (
					<div class="alert">
						<span>Checking your sign-in status...</span>
					</div>
				) : !user ? (
					<div class="card bg-base-200 shadow-md">
						<div class="card-body">
							<h2 class="card-title">Sign in required</h2>
							<p>You need to sign in with Google before creating a listing.</p>
							<div class="card-actions justify-end">
								<button type="button" class="btn btn-primary" onClick={startGoogleAuth}>
									Sign in with Google
								</button>
							</div>
						</div>
					</div>
				) : (
					<form class="card bg-base-200 shadow-md" onSubmit={submitListing}>
						<div class="card-body gap-4">
							<fieldset class="fieldset">
								<label class="label" for="listing-game">Game</label>
								<input
									id="listing-game"
									aria-label="Game"
									list="game-list"
									class="input input-bordered"
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
								<p class="label">
									{selectedGame
										? 'Game selected'
										: 'Search and choose one result.'}
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

								<label class="label" for="listing-condition">Condition</label>
								<select
									id="listing-condition"
									aria-label="Condition"
									class="select select-bordered"
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

								<label class="label" for="listing-price">Price ($)</label>
								<input
									id="listing-price"
									aria-label="Price ($)"
									class="input input-bordered"
									type="number"
									inputMode="numeric"
									min="0"
									step="1"
									required
									placeholder="25"
									value={price}
									onInput={(event) =>
										setPrice((event.currentTarget as HTMLInputElement).value)
									}
								/>

								<label class="label" for="listing-description">Description</label>
								<textarea
									id="listing-description"
									aria-label="Description"
									class="textarea textarea-bordered min-h-32"
									maxLength={1200}
									placeholder="Include box condition, missing pieces, edition notes, and meetup preferences."
									value={description}
									onInput={(event) =>
										setDescription((event.currentTarget as HTMLTextAreaElement).value)
									}
								/>

								<label class="label" for="listing-images">Images</label>
								<input
									id="listing-images"
									aria-label="Images"
									class="file-input file-input-bordered"
									type="file"
									multiple
									accept=".webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg"
									onChange={handleFileChange}
								/>
								<p class="label">Add up to 3 images in webp, png, or jpg format.</p>
							</fieldset>

							{creatingListing ? (
								<div class="alert">
									<span>Creating listing...</span>
								</div>
							) : null}

							{totalUploads > 0 ? (
								<div class="card bg-base-100 shadow-sm">
									<div class="card-body gap-2">
										<h2 class="card-title text-base">Image uploads</h2>
										<p>{uploadedCount} of {totalUploads} uploaded</p>
										<ul class="space-y-2">
											{uploadItems.map((item) => (
												<li key={item.file.name} class="flex items-center justify-between gap-3">
													<span>{item.file.name}</span>
													<span class="capitalize">{item.status}</span>
												</li>
											))}
										</ul>
									</div>
								</div>
							) : null}

							{submitError ? (
								<div class="alert alert-error">
									<span>{submitError}</span>
								</div>
							) : null}

							{submitSuccess ? (
								<div class="alert alert-success">
									<span>{submitSuccess}</span>
								</div>
							) : null}

							{hasFailedUpload ? (
								<div class="card-actions justify-end">
									<button
										type="button"
										class="btn btn-outline"
										onClick={retryFailedUploads}
										disabled={uploadingImages}
									>
										Retry failed uploads
									</button>
									<button
										type="button"
										class="btn btn-ghost"
										onClick={cancelRemainingUploads}
										disabled={uploadingImages}
									>
										Cancel remaining uploads
									</button>
								</div>
							) : null}

							<div class="card-actions justify-end">
								<button type="submit" class="btn btn-primary" disabled={isSubmitting}>
									{isSubmitting ? 'Publishing...' : 'Publish listing'}
								</button>
							</div>
						</div>
					</form>
				)}
			</section>

			<footer class="footer items-center p-4 bg-base-300 text-base-content">
				<aside class="items-center grid-flow-col">
					<p>
						Copyright © {new Date().getFullYear()} - All right reserved by Game Trades Club
					</p>
				</aside>
			</footer>
		</div>
	);
}
