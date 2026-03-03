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

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [condition, setCondition] = useState('good');

	const [gameQuery, setGameQuery] = useState('');
	const [gameResults, setGameResults] = useState<GameSearchResult[]>([]);
	const [selectedGame, setSelectedGame] = useState<GameSearchResult | null>(null);
	const [showGameMenu, setShowGameMenu] = useState(false);
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
		setShowGameMenu(false);
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

		setSubmitting(true);

		try {
			const response = await fetch('/api/listings', {
				method: 'POST',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					description: description.trim(),
					game_id: String(selectedGame.id),
					condition,
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
					const errorBody = (await response.json()) as { error?: string };
					setSubmitError(errorBody.error ?? 'Unable to create listing.');
				} catch {
					setSubmitError('Unable to create listing.');
				}
				return;
			}

			setTitle('');
			setDescription('');
			setCondition('good');
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
						Choose your game, add details, and publish your listing.
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
							<div class="form-control">
								<label class="label" for="listing-title">
									<span class="label-text font-semibold">Listing title</span>
								</label>
								<input
									id="listing-title"
									class="input input-bordered w-full"
									type="text"
									required
									maxLength={120}
									placeholder="Example: Catan complete set"
									value={title}
									onInput={(event) =>
										setTitle((event.currentTarget as HTMLInputElement).value)
									}
								/>
							</div>

							<div class="form-control">
								<label class="label" for="listing-game">
									<span class="label-text font-semibold">Game</span>
								</label>
								<div class="relative">
									<input
										id="listing-game"
										class="input input-bordered w-full"
										type="text"
										required
										placeholder="Search game names (min 2 characters)"
										value={gameQuery}
										onFocus={() => setShowGameMenu(true)}
										onBlur={() =>
											window.setTimeout(() => setShowGameMenu(false), 120)
										}
										onInput={(event) => {
											setGameQuery((event.currentTarget as HTMLInputElement).value);
											setSelectedGame(null);
											setShowGameMenu(true);
										}}
									/>

									{showGameMenu && gameQuery.trim().length >= 2 ? (
										<ul class="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
											{loadingGames ? (
												<li class="px-2 py-2 text-sm opacity-70">Searching games...</li>
											) : gameError ? (
												<li class="px-2 py-2 text-sm text-error">{gameError}</li>
											) : gameResults.length === 0 ? (
												<li class="px-2 py-2 text-sm opacity-70">No games found.</li>
											) : (
												gameResults.map((game) => (
													<li key={game.id}>
														<button
															type="button"
															class="btn btn-ghost btn-sm w-full justify-start normal-case"
															onMouseDown={(event) => {
																event.preventDefault();
																selectGame(game);
															}}
														>
															{formatGameLabel(game)}
														</button>
													</li>
												))
											)}
										</ul>
									) : null}
								</div>
								<label class="label">
									<span class="label-text-alt">
										{selectedGame
											? `Selected: ${formatGameLabel(selectedGame)}`
											: 'Search and choose one exact game result.'}
									</span>
								</label>
							</div>

							<div class="form-control">
								<label class="label" for="listing-condition">
									<span class="label-text font-semibold">Condition</span>
								</label>
								<select
									id="listing-condition"
									class="select select-bordered w-full"
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

							<div class="form-control">
								<label class="label" for="listing-description">
									<span class="label-text font-semibold">Description</span>
								</label>
								<textarea
									id="listing-description"
									class="textarea textarea-bordered min-h-32"
									maxLength={1200}
									placeholder="Include box condition, missing pieces, edition notes, and meetup preferences."
									value={description}
									onInput={(event) =>
										setDescription((event.currentTarget as HTMLTextAreaElement).value)
									}
								/>
							</div>

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
