import { useEffect, useState } from 'preact/hooks';

type Theme = 'daylight' | 'tabletop';

const THEME_KEY = 'theme';

type CurrentUser = {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
};

function getSavedTheme(): Theme {
	if (typeof window === 'undefined') return 'daylight';

	const saved = localStorage.getItem(THEME_KEY);
	if (saved === 'tabletop' || saved === 'night') return 'tabletop';
	if (saved === 'daylight' || saved === 'light') return 'daylight';

	const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
	return prefersDark ? 'tabletop' : 'daylight';
}

export function Header() {
	const [theme, setTheme] = useState<Theme>('daylight');
	const [user, setUser] = useState<CurrentUser | null>(null);
	const [loadingUser, setLoadingUser] = useState(true);

	useEffect(() => {
		const initialTheme = getSavedTheme();
		setTheme(initialTheme);
		document.documentElement.setAttribute('data-theme', initialTheme);
	}, []);

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

	const toggleTheme = () => {
		const nextTheme: Theme = theme === 'daylight' ? 'tabletop' : 'daylight';
		setTheme(nextTheme);
		document.documentElement.setAttribute('data-theme', nextTheme);
		localStorage.setItem(THEME_KEY, nextTheme);
	};

	const logout = async () => {
		await fetch('/api/auth/logout', {
			method: 'POST',
			credentials: 'include',
		});
		setUser(null);
	};

	const startGoogleAuth = () => {
		window.location.href = '/api/auth/google/start';
	};

	const isDark = theme === 'tabletop';

	return (
		<header class="sticky top-0 z-30 backdrop-blur-md bg-base-100/85 border-b border-base-300/70">
			<div class="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
				<a
					href="/"
					class="group inline-flex items-center gap-2.5"
					aria-label="Game Trades Club home"
				>
					<span
						class="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-content shadow-sm ring-1 ring-primary/30 transition-transform group-hover:-rotate-6"
					>
						<svg viewBox="0 0 32 32" class="w-5 h-5 fill-current" aria-hidden="true">
							<path d="M16 4c-3 0-5.2 2.4-5.2 5.4 0 1.7.8 3 1.8 3.9-3 .7-5.6 2.9-6.4 6.1-.5 2 .2 3.9 1.9 4.9 1.4.8 3 1 4.5.6L13 23v3a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-3l.4-.1c1.5.4 3.1.2 4.5-.6 1.7-1 2.4-2.9 1.9-4.9-.8-3.2-3.4-5.4-6.4-6.1 1-.9 1.8-2.2 1.8-3.9C21.2 6.4 19 4 16 4Z" />
						</svg>
					</span>
					<span class="flex flex-col leading-none">
						<span class="font-display text-[1.25rem] font-semibold tracking-tight">
							Game Trades<span class="text-primary">.</span>Club
						</span>
						<span class="text-[10px] uppercase tracking-[0.18em] text-base-content/55 mt-0.5">
							Trade local · play more
						</span>
					</span>
				</a>

				<nav class="hidden md:flex items-center gap-1 text-sm font-medium">
					<a href="/games" class="px-3 py-2 rounded-lg hover:bg-base-200 transition-colors">
						Browse
					</a>
					<a href="/add-listing" class="px-3 py-2 rounded-lg hover:bg-base-200 transition-colors">
						List a game
					</a>
					<a href="/shops" class="px-3 py-2 rounded-lg hover:bg-base-200 transition-colors">
						Shops
					</a>
					<a href="/#how-it-works" class="px-3 py-2 rounded-lg hover:bg-base-200 transition-colors">
						How it works
					</a>
				</nav>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onClick={toggleTheme}
						class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-base-300 hover:bg-base-200 transition-colors"
						aria-label={isDark ? 'Switch to daylight theme' : 'Switch to tabletop theme'}
						title={isDark ? 'Switch to daylight' : 'Switch to tabletop'}
					>
						{isDark ? (
							<svg viewBox="0 0 24 24" class="w-4.5 h-4.5 fill-none stroke-current" stroke-width="1.6" aria-hidden="true">
								<circle cx="12" cy="12" r="4" />
								<path stroke-linecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
							</svg>
						) : (
							<svg viewBox="0 0 24 24" class="w-4.5 h-4.5 fill-current" aria-hidden="true">
								<path d="M20.5 14.2A8 8 0 0 1 9.8 3.5a.6.6 0 0 0-.8-.7 9.5 9.5 0 1 0 12.2 12.2.6.6 0 0 0-.7-.8Z" />
							</svg>
						)}
					</button>

					{loadingUser ? (
						<span class="text-xs text-base-content/60 px-2 hidden sm:inline">Checking…</span>
					) : user ? (
						<div class="dropdown dropdown-end">
							<div
								tabIndex={0}
								role="button"
								class="btn btn-ghost btn-circle avatar ring-1 ring-base-300"
							>
								<div class="w-9 rounded-full">
									{user.avatarUrl ? (
										<img alt={user.name ?? user.email} src={user.avatarUrl} />
									) : (
										<div class="w-full h-full grid place-items-center bg-secondary text-secondary-content text-sm font-semibold">
											{(user.name ?? user.email).slice(0, 1).toUpperCase()}
										</div>
									)}
								</div>
							</div>
							<ul
								tabIndex={-1}
								class="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-2 p-2 w-44 shadow-lg border border-base-300"
							>
								<li class="menu-title">
									<span class="truncate">{user.name ?? user.email}</span>
								</li>
								<li><a href="/add-listing">List a game</a></li>
								<li><a onClick={logout}>Sign out</a></li>
							</ul>
						</div>
					) : (
						<button
							type="button"
							class="btn btn-sm btn-primary rounded-lg"
							onClick={startGoogleAuth}
						>
							Sign in
						</button>
					)}
				</div>
			</div>
		</header>
	);
}
