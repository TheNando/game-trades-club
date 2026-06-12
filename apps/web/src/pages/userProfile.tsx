import { useEffect, useState } from 'preact/hooks';
import { ListingCard, type ListingCardData } from '../components/ListingCard';

type Listing = ListingCardData & {
	user_id: string;
	created_at: string;
	updated_at: string;
};

type PublicUser = {
	id: string;
	name: string | null;
	avatar_url: string | null;
	created_at: string;
};

type UserProfileResponse = {
	user: PublicUser;
	current_listings: Listing[];
	past_listings: Listing[];
};

function formatMemberSince(value: string): string {
	const date = new Date(value.replace(' ', 'T') + 'Z');
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function UserProfile({ id }: { id?: string }) {
	const [profile, setProfile] = useState<UserProfileResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!id) {
			setError('User not found.');
			setLoading(false);
			return;
		}

		let isMounted = true;
		const loadProfile = async () => {
			try {
				const response = await fetch(`/api/users/${encodeURIComponent(id)}`, {
					credentials: 'include',
				});

				if (response.status === 404) {
					if (isMounted) setError('User not found.');
					return;
				}
				if (!response.ok) {
					if (isMounted) setError('Unable to load this profile right now.');
					return;
				}

				const data = (await response.json()) as UserProfileResponse;
				if (isMounted) setProfile(data);
			} catch {
				if (isMounted) setError('Unable to load this profile right now.');
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		loadProfile();
		return () => {
			isMounted = false;
		};
	}, [id]);

	if (loading) {
		return (
			<div class="max-w-5xl mx-auto px-4 md:px-8 py-10">
				<div class="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-base-content/75">
					<span>Loading profile...</span>
				</div>
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div class="max-w-5xl mx-auto px-4 md:px-8 py-10">
				<div class="alert alert-error rounded-xl">
					<span>{error || 'User not found.'}</span>
				</div>
				<div class="mt-6">
					<a href="/games" class="btn btn-ghost rounded-xl border border-base-300">
						Back to listings
					</a>
				</div>
			</div>
		);
	}

	const { user, current_listings, past_listings } = profile;
	const displayName = user.name ?? 'A neighbor';
	const initial = (user.name ?? 'N').slice(0, 1).toUpperCase();

	return (
		<div class="min-h-screen bg-base-100 text-base-content">
			<ProfileHeader user={user} displayName={displayName} initial={initial} />
			<section class="max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-16 flex flex-col gap-10">
				<ListingsSection
					title="Current listings"
					emptyLabel={`${displayName} isn't listing anything right now.`}
					listings={current_listings}
				/>
				<ListingsSection
					title="Trade history"
					emptyLabel="No completed trades yet."
					listings={past_listings}
				/>
			</section>
		</div>
	);
}

type HeaderProps = {
	user: PublicUser;
	displayName: string;
	initial: string;
};

function ProfileHeader({ user, displayName, initial }: HeaderProps) {
	return (
		<section class="relative overflow-hidden border-b border-base-300 bg-base-200 bg-paper">
			<div class="absolute inset-0 bg-dotgrid opacity-[0.25] pointer-events-none" />
			<div class="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pt-12 pb-10 flex items-center gap-5">
				<div class="w-20 h-20 rounded-2xl overflow-hidden border border-base-300 bg-base-100 grid place-items-center shadow-sm">
					{user.avatar_url ? (
						<img alt={displayName} src={user.avatar_url} class="w-full h-full object-cover" />
					) : (
						<span class="font-display text-3xl text-base-content/70">{initial}</span>
					)}
				</div>
				<div class="flex flex-col">
					<p class="text-xs uppercase tracking-[0.22em] text-primary/80 font-semibold">
						Member
					</p>
					<h1 class="font-display text-3xl md:text-4xl font-medium mt-1 leading-tight">
						{displayName}
					</h1>
					<p class="mt-2 text-sm text-base-content/65">
						Member since {formatMemberSince(user.created_at)}
					</p>
				</div>
			</div>
		</section>
	);
}

type ListingsSectionProps = {
	title: string;
	emptyLabel: string;
	listings: Listing[];
};

function ListingsSection({ title, emptyLabel, listings }: ListingsSectionProps) {
	return (
		<div class="flex flex-col gap-4">
			<div class="flex items-baseline justify-between gap-3">
				<h2 class="font-display text-2xl">{title}</h2>
				<span class="text-xs text-base-content/55">{listings.length}</span>
			</div>
			{listings.length === 0 ? (
				<div class="rounded-2xl border border-base-300 bg-base-200/60 p-6 text-base-content/65">
					{emptyLabel}
				</div>
			) : (
				<ul class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
					{listings.map((listing) => (
						<li key={listing.id}>
							<ListingCard listing={listing} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
