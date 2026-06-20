import { useMemo } from 'preact/hooks';

export function Home() {
	return (
		<div class="min-h-screen bg-base-100 text-base-content">
			{/* ── Hero ──────────────────────────────────────────────────── */}
			<section class="relative overflow-hidden bg-base-200 bg-paper grain">
				<div class="absolute inset-0 bg-dotgrid opacity-[0.35] pointer-events-none" />
				<div class="relative z-10 max-w-6xl mx-auto px-4 md:px-8 pt-16 pb-24 md:pt-24 md:pb-32 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
					<div class="lg:col-span-7 rise-in">
						<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-base-300/80 bg-base-100/70 backdrop-blur text-xs font-medium tracking-wide text-base-content/75">
							<span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
							A friendly trading community
						</span>

						<h1 class="font-display mt-5 text-[3.25rem] sm:text-6xl lg:text-[5.25rem] leading-[0.95] font-medium tracking-tight">
							Trade board games
							<br />
							with neighbors you'll{' '}
							<span class="font-display-wonk italic deco-underline text-primary">actually meet</span>.
						</h1>

						<p class="mt-6 max-w-xl text-lg text-base-content/75 leading-relaxed">
							No shipping anxiety. No mystery sellers. Swap games with people in your
							city and hand them off at a local game shop you already know and trust.
						</p>

						<div class="mt-8 flex flex-wrap items-center gap-3">
							<a
								href="/games"
								class="btn btn-primary btn-lg rounded-xl shadow-sm hover:shadow-md transition-all"
							>
								Browse games
								<svg viewBox="0 0 24 24" class="w-4 h-4 ml-1 fill-none stroke-current" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
								</svg>
							</a>
							<a
								href="/add-listing"
								class="btn btn-ghost btn-lg rounded-xl border border-base-300 hover:bg-base-100"
							>
								List a game
							</a>
						</div>

						<dl class="mt-10 grid grid-cols-3 gap-3 sm:gap-6 max-w-md">
							{[
								{ k: 'Local', v: 'Meet within your city' },
								{ k: '$0', v: 'No shipping, ever' },
								{ k: 'Verified', v: 'Trusted game shops' },
							].map((s) => (
								<div key={s.k} class="border-l-2 border-primary/60 pl-3">
									<dt class="font-display text-2xl sm:text-3xl font-medium leading-none">{s.k}</dt>
									<dd class="mt-1 text-xs sm:text-sm text-base-content/65 leading-snug">{s.v}</dd>
								</div>
							))}
						</dl>
					</div>

					{/* Stacked "listing cards" composition */}
					<div class="lg:col-span-5 relative h-105 sm:h-120 hidden md:block">
						<HeroStack />
					</div>
				</div>
			</section>

			{/* ── How it works ─────────────────────────────────────────── */}
			<section id="how-it-works" class="py-20 md:py-28 px-4 md:px-8">
				<div class="max-w-6xl mx-auto">
					<div class="flex items-end justify-between gap-6 flex-wrap mb-12">
						<div>
							<p class="text-xs uppercase tracking-[0.22em] text-primary/80 font-semibold">
								How it works
							</p>
							<h2 class="font-display text-4xl md:text-5xl font-medium mt-3 max-w-xl leading-tight">
								Three friendly steps, zero shipping labels.
							</h2>
						</div>
						<p class="text-base-content/65 max-w-sm">
							Built around the simplest, most human way to swap a game: agree online,
							meet in person.
						</p>
					</div>

					<ol class="grid md:grid-cols-3 gap-5 lg:gap-7">
						<Step
							n="01"
							title="List what's on your shelf"
							body="Snap a couple of photos, jot down condition and price, and your listing is live in under a minute."
							tone="primary"
						/>
						<Step
							n="02"
							title="Match with a neighbor"
							body="Get a message from someone nearby who wants the game. Pick a time and a shop that works for both of you."
							tone="secondary"
						/>
						<Step
							n="03"
							title="Hand it off at the shop"
							body="Meet at a verified local store, give the game a quick look together, and walk out with your trade."
							tone="accent"
						/>
					</ol>
				</div>
			</section>

			{/* ── Why us ───────────────────────────────────────────────── */}
			<section class="px-4 md:px-8 pb-20 md:pb-28">
				<div class="max-w-6xl mx-auto rounded-3xl border border-base-300 bg-base-200/60 overflow-hidden">
					<div class="grid md:grid-cols-[1.1fr_1fr]">
						<div class="p-8 md:p-12 bg-base-200/80 border-b md:border-b-0 md:border-r border-base-300">
							<p class="text-xs uppercase tracking-[0.22em] text-base-content/55 font-semibold">
								The old way
							</p>
							<h3 class="font-display text-3xl md:text-4xl mt-2 leading-tight text-base-content/70">
								Ship blindly to a stranger and hope for the best.
							</h3>
							<ul class="mt-6 space-y-3 text-base-content/65">
								{[
									'Shipping a heavy box costs more than the game',
									'Damage and lost packages are on you',
									'You never actually meet another player',
									'Days or weeks before anything happens',
								].map((t) => (
									<li key={t} class="flex gap-3">
										<span class="mt-2 w-1.5 h-1.5 rounded-full bg-base-content/30 flex-none" />
										<span>{t}</span>
									</li>
								))}
							</ul>
						</div>

						<div class="p-8 md:p-12 relative">
							<p class="text-xs uppercase tracking-[0.22em] text-primary font-semibold">
								The Club way
							</p>
							<h3 class="font-display text-3xl md:text-4xl mt-2 leading-tight">
								Trade in person with someone from{' '}
								<span class="text-primary">your own scene</span>.
							</h3>
							<ul class="mt-6 space-y-3">
								{[
									{ k: 'Zero shipping cost', v: 'Always free — you meet up' },
									{ k: 'Inspect before you trade', v: 'See the box, count the pieces' },
									{ k: 'Real community', v: 'Faces, not usernames' },
									{ k: 'Same-week swaps', v: 'Most trades happen within days' },
								].map((row) => (
									<li key={row.k} class="flex items-start gap-3">
										<span class="mt-1 inline-flex w-5 h-5 rounded-md bg-primary/15 text-primary items-center justify-center flex-none">
											<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-none stroke-current" stroke-width="3">
												<path stroke-linecap="round" stroke-linejoin="round" d="m5 12 5 5L20 7" />
											</svg>
										</span>
										<span>
											<span class="font-medium">{row.k}.</span>{' '}
											<span class="text-base-content/70">{row.v}</span>
										</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* ── Trust strip ──────────────────────────────────────────── */}
			<section class="px-4 md:px-8 pb-20 md:pb-28">
				<div class="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
					<div class="flex-1">
						<p class="text-xs uppercase tracking-[0.22em] text-base-content/55 font-semibold">
							Pickups happen at
						</p>
						<p class="font-display text-2xl md:text-3xl mt-1 leading-tight">
							Verified local game stores in your city.
						</p>
					</div>
					<div class="flex flex-wrap gap-2 md:justify-end">
						{['Friendly Local Game Store', 'Café & Board Game Bar', 'Hobby Shop', 'Community Library'].map((label) => (
							<span
								key={label}
								class="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-base-300 bg-base-200/60 text-sm text-base-content/75"
							>
								<span class="w-1.5 h-1.5 rounded-full bg-secondary" />
								{label}
							</span>
						))}
					</div>
				</div>
			</section>

			{/* ── Final CTA ────────────────────────────────────────────── */}
			<section class="px-4 md:px-8 pb-20 md:pb-28">
				<div class="relative max-w-6xl mx-auto rounded-3xl overflow-hidden bg-primary text-primary-content grain">
					<div class="absolute inset-0 opacity-25 bg-dotgrid pointer-events-none" />
					<div class="relative z-10 px-8 py-14 md:px-14 md:py-20 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
						<div>
							<h2 class="font-display text-4xl md:text-5xl font-medium leading-tight">
								Your shelf has stories left to tell.
							</h2>
							<p class="mt-4 text-primary-content/85 max-w-md">
								Hand a beloved game to someone who'll play it tonight. Join the
								Club — it takes a minute, and your first listing is on the house.
							</p>
						</div>
						<div class="flex flex-wrap gap-3 md:justify-end">
							<a
								href="/add-listing"
								class="btn btn-lg rounded-xl bg-base-100 text-primary border-none hover:bg-base-100/90"
							>
								List your first game
							</a>
							<a
								href="/games"
								class="btn btn-lg btn-ghost rounded-xl border border-primary-content/30 text-primary-content hover:bg-primary-content/10"
							>
								Browse trades
							</a>
						</div>
					</div>
				</div>
			</section>

			{/* ── Footer ───────────────────────────────────────────────── */}
			<footer class="border-t border-base-300 bg-base-200/60">
				<div class="max-w-6xl mx-auto px-4 md:px-8 py-10 grid sm:grid-cols-2 gap-6 items-center">
					<div>
						<p class="font-display text-xl">
							Game Trades<span class="text-primary">.</span>Club
						</p>
						<p class="text-sm text-base-content/60 mt-1">
							A community for trading board games, the human way.
						</p>
					</div>
					<p class="text-sm text-base-content/55 sm:text-right">
						© {new Date().getFullYear()} Game Trades Club · Made for tabletop people.
					</p>
				</div>
			</footer>
		</div>
	);
}

type StepProps = { n: string; title: string; body: string; tone: 'primary' | 'secondary' | 'accent' };

function Step({ n, title, body, tone }: StepProps) {
	const ring =
		tone === 'primary' ? 'text-primary' : tone === 'secondary' ? 'text-secondary' : 'text-accent';
	return (
		<li class="group relative rounded-2xl border border-base-300 bg-base-100 p-6 md:p-7 hover:border-base-content/30 transition-colors">
			<div class="flex items-start justify-between gap-3">
				<span class={`font-display text-5xl md:text-6xl font-medium leading-none ${ring}`}>{n}</span>
				<span class="mt-2 h-px flex-1 bg-base-300 group-hover:bg-base-content/30 transition-colors" />
			</div>
			<h3 class="font-display text-2xl mt-5 leading-snug">{title}</h3>
			<p class="mt-3 text-base-content/70 leading-relaxed">{body}</p>
		</li>
	);
}

const HERO_CARDS: Array<Pick<MiniCardProps, 'title' | 'meta' | 'accent' | 'emoji'>> = [
	{ title: 'Wingspan', meta: 'Like new · $42', accent: 'secondary', emoji: '🐦' },
	{ title: 'Brass: Birmingham', meta: 'Good · trade', accent: 'primary', emoji: '🏭' },
	{ title: 'Catan', meta: 'Open box · $25', accent: 'accent', emoji: '🐑' },
	{ title: 'Ticket to Ride', meta: 'Good · $30', accent: 'primary', emoji: '🚂' },
	{ title: 'Carcassonne', meta: 'Like new · trade', accent: 'accent', emoji: '🏰' },
	{ title: 'Pandemic', meta: 'Good · $20', accent: 'secondary', emoji: '🦠' },
	{ title: '7 Wonders', meta: 'Like new · $28', accent: 'primary', emoji: '🏛️' },
	{ title: 'Azul', meta: 'Open box · $24', accent: 'accent', emoji: '🎨' },
	{ title: 'Splendor', meta: 'Good · trade', accent: 'secondary', emoji: '💎' },
	{ title: 'Terraforming Mars', meta: 'Like new · $48', accent: 'primary', emoji: '🚀' },
	{ title: 'Root', meta: 'Good · $40', accent: 'accent', emoji: '🦝' },
	{ title: 'Everdell', meta: 'Like new · $55', accent: 'secondary', emoji: '🌳' },
	{ title: 'Gloomhaven', meta: 'Good · trade', accent: 'primary', emoji: '⚔️' },
];

const HERO_SLOTS: Array<{ style: Record<string, string>; className: string }> = [
	{ style: { top: '8%', left: '8%', '--r': '-7deg' }, className: 'float-y' },
	{ style: { top: '22%', right: '6%', '--r': '6deg', animationDelay: '1.2s' }, className: 'float-y' },
	{ style: { bottom: '6%', left: '18%', '--r': '-2deg', animationDelay: '2.4s' }, className: 'float-y' },
];

function HeroStack() {
	const cards = useMemo(() => {
		const shuffled = [...HERO_CARDS];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled.slice(0, HERO_SLOTS.length);
	}, []);

	return (
		<div class="absolute inset-0">
			{cards.map((card, i) => (
				<MiniCard
					key={card.title}
					style={HERO_SLOTS[i].style as any}
					className={HERO_SLOTS[i].className}
					title={card.title}
					meta={card.meta}
					accent={card.accent}
					emoji={card.emoji}
				/>
			))}
		</div>
	);
}

type MiniCardProps = {
	title: string;
	meta: string;
	accent: 'primary' | 'secondary' | 'accent';
	emoji: string;
	style?: Record<string, string>;
	className?: string;
};

function MiniCard({ title, meta, accent, emoji, style, className = '' }: MiniCardProps) {
	const tint =
		accent === 'primary'
			? 'bg-primary/15 text-primary'
			: accent === 'secondary'
				? 'bg-secondary/15 text-secondary'
				: 'bg-accent/20 text-accent-content';
	return (
		<div
			class={`absolute w-56 sm:w-64 rounded-2xl border border-base-300 bg-base-100 shadow-lg p-4 rotate-(--r,0deg) ${className}`}
			style={style}
		>
			<div class={`aspect-4/3 rounded-xl grid place-items-center text-5xl ${tint}`}>
				<span aria-hidden="true">{emoji}</span>
			</div>
			<div class="mt-3 flex items-baseline justify-between gap-2">
				<p class="font-display text-lg leading-tight truncate">{title}</p>
				<span class="text-[10px] uppercase tracking-wider text-base-content/55">Listing</span>
			</div>
			<p class="text-sm text-base-content/65 mt-0.5">{meta}</p>
		</div>
	);
}