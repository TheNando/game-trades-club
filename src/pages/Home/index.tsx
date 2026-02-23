import preactLogo from '../../assets/preact.svg';

export function Home() {
	return (
		<div class="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
			<div class="hero rounded-box border border-base-300 bg-base-200">
				<div class="hero-content flex-col py-10 text-center">
					<a href="https://preactjs.com" target="_blank" rel="noreferrer">
						<img
							src={preactLogo}
							alt="Preact logo"
							height="160"
							width="160"
							class="transition-all duration-300 hover:drop-shadow-[0_0_1.5rem_rgba(103,58,183,0.55)]"
						/>
					</a>
					<div class="space-y-3">
						<h1 class="text-3xl font-bold md:text-4xl">
							Get Started Building Vite-powered Preact Apps
						</h1>
						<p class="mx-auto max-w-xl text-base-content/80">
							Explore the official docs and guides to level up quickly.
						</p>
					</div>
					<div class="mt-2">
						<a
							href="https://preactjs.com/guide/v10/getting-started"
							target="_blank"
							rel="noreferrer"
							class="btn btn-primary"
						>
							Start with Preact Guide
						</a>
					</div>
				</div>
			</div>
			<section class="mt-8 grid gap-4 md:grid-cols-3">
				<Resource
					title="Learn Preact"
					description="If you're new to Preact, try the interactive tutorial to learn important concepts."
					href="https://preactjs.com/tutorial"
				/>
				<Resource
					title="Differences to React"
					description="If you're coming from React, check out where Preact differs."
					href="https://preactjs.com/guide/v10/differences-to-react"
				/>
				<Resource
					title="Learn Vite"
					description="Discover how Vite can be customized to match your needs."
					href="https://vitejs.dev"
				/>
			</section>
		</div>
	);
}

type ResourceProps = {
	title: string;
	description: string;
	href: string;
};

function Resource(props: ResourceProps) {
	return (
		<a
			href={props.href}
			target="_blank"
			rel="noreferrer"
			class="card border border-base-300 bg-base-100 shadow-sm transition hover:shadow-xl"
		>
			<div class="card-body text-left">
				<h2 class="card-title">{props.title}</h2>
				<p class="text-base-content/75">{props.description}</p>
				<div class="card-actions justify-end">
					<span class="btn btn-sm btn-outline">Open</span>
				</div>
			</div>
		</a>
	);
}
