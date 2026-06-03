export function NotFound() {
	return (
		<section class="relative overflow-hidden min-h-[70vh] bg-base-200 bg-paper grain">
			<div class="absolute inset-0 bg-dotgrid opacity-[0.3] pointer-events-none" />
			<div class="relative z-10 max-w-3xl mx-auto px-6 py-24 md:py-32 text-center">
				<div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-base-100 border border-base-300 shadow-sm rotate-[-6deg] mb-8">
					<span class="font-display text-4xl text-primary">?</span>
				</div>
				<p class="text-xs uppercase tracking-[0.22em] text-base-content/55 font-semibold">
					Error 404
				</p>
				<h1 class="font-display text-5xl md:text-6xl font-medium leading-tight mt-3">
					This card got{' '}
					<span class="font-display-wonk italic text-primary">shuffled</span>{' '}
					out of the deck.
				</h1>
				<p class="mt-5 text-lg text-base-content/70 max-w-xl mx-auto">
					The page you're looking for isn't on the table. Let's get you back to
					the games.
				</p>
				<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
					<a href="/" class="btn btn-primary btn-lg rounded-xl">
						Back to home
					</a>
					<a
						href="/add-listing"
						class="btn btn-ghost btn-lg rounded-xl border border-base-300"
					>
						List a game instead
					</a>
				</div>
			</div>
		</section>
	);
}
