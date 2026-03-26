import { useEffect, useState } from 'preact/hooks';

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

function formatGameLabel(game: GameSearchResult): string {
	return `${game.name} (${game.year ?? 'Unknown'})`;
}

export function AddListing() {
	const [user, setUser] = useState<CurrentUser | null>(null);
	const [loadingUser, setLoadingUser] = useState(true);

	const [description, setDescription] = useState('');
	const [condition, setCondition] = useState('good');
	const [price, setPrice] = useState('');
	const [imageUrl, setImageUrl] = useState('');
	const [imageThumbnailUrl, setImageThumbnailUrl] = useState('');

	const [gameQuery, setGameQuery] = useState('');
	const [gameResults, setGameResults] = useState<GameSearchResult[]>([]);
	const [selectedGame, setSelectedGame] = useState<GameSearchResult | null>(null);
	const [loadingGames, setLoadingGames] = useState(false);
	const [gameError, setGameError] = useState('');

	const [submitError, setSubmitError] = useState('');
	const [submitSuccess, setSubmitSuccess] = useState('');
	const [submitting, setSubmitting] = useState(false);

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

	const selectGame = (game: GameSearchResult) => {
		setSelectedGame(game);
		setGameQuery(formatGameLabel(game));
		setGameResults([]);
		setGameError('');
	};

	const startGoogleAuth = () => {
		window.location.href = '/api/auth/google/start';
	};

	const submitListing = async (event: Event) => {
		event.preventDefault();
		setSubmitError('');
		setSubmitSuccess('');

		if (!selectedGame) {
			setSubmitError('Select a game from the search results first.');
			return;
		}

		const normalizedPrice = price.trim();
		if (!/^\d+$/.test(normalizedPrice)) {
			setSubmitError('Enter price in dollars.');
			return;
		}

		setSubmitting(true);

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
					image_url: imageUrl.trim(),
					image_thumbnail_url: imageThumbnailUrl.trim(),
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

			setDescription('');
			setCondition('good');
			setPrice('');
			setImageUrl('');
			setImageThumbnailUrl('');
			setGameQuery('');
			setSelectedGame(null);
			setGameResults([]);
			setSubmitSuccess('Listing created successfully.');
		} catch {
			setSubmitError('Unable to create listing.');
		} finally {
			setSubmitting(false);
		}
	};

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
								{/* Game */}
								<legend class="fieldset-legend">Game</legend>
								<input
									id="listing-game"
									list="game-list"
									class="input input-bordered"
									type="text"
									required
									placeholder="Search game names (min 2 characters)"
									value={selectedGame ? formatGameLabel(selectedGame) : gameQuery}
									onInput={(event) => {
										// Check for matching game if datalist option selected
										const gameId = parseInt((event.currentTarget as HTMLInputElement).value, 10);
										const game = gameResults.find(g => g.id === gameId);
										if (game) {
											setSelectedGame(game);
										}
										// Query for matching games if text typed
										else {
											setGameQuery((event.currentTarget as HTMLInputElement).value);
											setSelectedGame(null);
										}
									}}
								/>
								<p class="label">
									{selectedGame
										? `✅ Game selected`
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

								{/* Condition */}
								<legend class="fieldset-legend">Condition</legend>
								<select
									id="listing-condition"
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

								{/* Price */}
								<legend class="fieldset-legend">Price ($)</legend>
								<input
									id="listing-price"
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

								{/* Description */}
								<legend class="fieldset-legend">Description</legend>
								<textarea id="listing-description"
									class="textarea textarea-bordered min-h-32"
									maxLength={1200}
									placeholder="Include box condition, missing pieces, edition notes, and meetup preferences."
									value={description}
									onInput={(event) =>
										setDescription((event.currentTarget as HTMLTextAreaElement).value)
									}></textarea>
							</fieldset>

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

							<div class="card-actions justify-end">
								<button type="submit" class="btn btn-primary" disabled={submitting}>
									{submitting ? 'Publishing...' : 'Publish listing'}
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
