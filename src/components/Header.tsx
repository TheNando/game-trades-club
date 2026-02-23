import { useLocation } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';

type Theme = 'light' | 'night';

const THEME_KEY = 'theme';
type CurrentUser = {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
};

function getSavedTheme(): Theme {
	if (typeof window === 'undefined') return 'light';

	const saved = localStorage.getItem(THEME_KEY);
	return saved === 'night' ? 'night' : 'light';
}

export function Header() {
	const { url } = useLocation();
	const [theme, setTheme] = useState<Theme>('light');
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
		const nextTheme: Theme = theme === 'light' ? 'night' : 'light';
		setTheme(nextTheme);
		document.documentElement.setAttribute('data-theme', nextTheme);
		localStorage.setItem(THEME_KEY, nextTheme);
	};

	const navLinkClass = (path: string) =>
		`btn btn-ghost btn-sm ${url === path ? 'btn-active' : ''}`;

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

	return (
		<header class="navbar bg-base-200 border-b border-base-300 px-4 md:px-8">
			<div class="navbar-start">
				<a class="text-lg font-semibold tracking-tight" href="/">
					Game Trades Club
				</a>
			</div>
			<div class="navbar-center">
				<nav class="menu menu-horizontal gap-2 p-0">
					<a href="/" class={navLinkClass('/')}>
						Home
					</a>
					<a href="/404" class={navLinkClass('/404')}>
						404
					</a>
				</nav>
			</div>
			<div class="navbar-end">
				{loadingUser ? (
					<span class="text-sm opacity-70">Checking auth...</span>
				) : user ? (
					<div class="mr-2 flex items-center gap-2">
						<span class="text-sm">{user.name ?? user.email}</span>
						<button type="button" class="btn btn-sm btn-outline" onClick={logout}>
							Sign out
						</button>
					</div>
				) : (
					<button type="button" class="btn btn-sm btn-primary mr-2" onClick={startGoogleAuth}>
						Sign in with Google
					</button>
				)}
				<button
					type="button"
					class="btn btn-ghost btn-circle"
					aria-label="Toggle theme"
					title="Toggle theme"
					onClick={toggleTheme}
				>
					<span class="swap swap-rotate">
						<span class={`swap-on text-xs ${theme === 'night' ? 'inline-block' : 'hidden'}`}>
							Moon
						</span>
						<span class={`swap-off text-xs ${theme === 'light' ? 'inline-block' : 'hidden'}`}>
							Sun
						</span>
					</span>
				</button>
			</div>
		</header>
	);
}
