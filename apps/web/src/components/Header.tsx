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

			<div class="navbar-end gap-3">
				<label className="swap swap-rotate" >
					{/* this hidden checkbox controls the state */}
					<input type="checkbox" onClick={toggleTheme} />

					{/* sun icon */}
					<svg
						className="swap-on h-6 w-6 fill-current"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24">
						<path
							d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
					</svg>

					{/* moon icon */}
					<svg
						className="swap-off h-6 w-6 fill-current"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24">
						<path
							d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
					</svg>
				</label>

				{loadingUser ? (
					<span class="text-sm opacity-70">Checking auth...</span>
				) : user ? (
					<div className="dropdown dropdown-end">
						<div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
							<div className="w-9 rounded-full">
								<img alt={user.name} src={user.avatarUrl} />
							</div>
						</div>
						<ul
							tabIndex={-1}
							className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 w- p-2 shadow">
							<li><a onClick={logout}>Logout</a></li>
						</ul>
					</div>
				) : (
					<button type="button" class="btn btn-sm btn-primary mr-2" onClick={startGoogleAuth}>
						Sign in with Google
					</button>
				)}
			</div>
		</header>
	);
}
