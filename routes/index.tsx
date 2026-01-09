import { define } from "../utils.ts";

export default define.page(function LandingPage(ctx) {
  ctx.state.title = "Game Trades Club";

  return (
    <div class="min-h-screen bg-base-100 font-sans">
      {/* Navbar Placeholder - assuming a layout handles this, but adding a simple header if not */}

      {/* Hero Section */}
      <section class="hero min-h-[70vh] bg-base-200 relative overflow-hidden">
        <div class="hero-content text-center relative z-10">
          <div class="max-w-3xl">
            <h1 class="text-5xl font-extrabold mb-6 leading-tight">
              Trade Board Games
              <br />
              <span class="text-primary">Locally & Safely</span>
            </h1>
            <p class="py-6 text-xl text-base-content/80 mb-8">
              Skip the shipping fees and risks. Meet at your verified local game
              shop to exchange games with players in your community.
            </p>
            <div class="flex justify-center gap-4">
              <a
                href="/games"
                class="btn btn-primary btn-lg shadow-lg hover:scale-105 transition-transform"
              >
                Browse Games
              </a>
              <a
                href="/list"
                class="btn btn-secondary btn-lg shadow-lg hover:scale-105 transition-transform"
              >
                List a Game
              </a>
            </div>
          </div>
        </div>
        {/* Background Decorative Pattern */}
        <div class="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div class="rating gap-1 absolute top-10 left-10 rotate-12">
            <input
              type="radio"
              name="rating-3"
              class="mask mask-heart bg-red-400"
            />
            <input
              type="radio"
              name="rating-3"
              class="mask mask-heart bg-orange-400"
              checked
            />
            <input
              type="radio"
              name="rating-3"
              class="mask mask-heart bg-yellow-400"
            />
            <input
              type="radio"
              name="rating-3"
              class="mask mask-heart bg-lime-400"
            />
          </div>
          <div class="absolute bottom-10 right-10 rotate-[-12deg] text-9xl">
            🎲
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section class="py-20 px-4 bg-base-100">
        <div class="max-w-5xl mx-auto text-center">
          <h2 class="text-4xl font-bold mb-16">How It Works</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
              <div class="card-body items-center text-center">
                <div class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-3xl">
                  📝
                </div>
                <h3 class="card-title text-2xl mb-2">1. List Your Game</h3>
                <p>
                  Post the games you want to sell or trade. It's free and takes
                  seconds.
                </p>
              </div>
            </div>
            {/* Step 2 */}
            <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
              <div class="card-body items-center text-center">
                <div class="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-4 text-3xl">
                  🤝
                </div>
                <h3 class="card-title text-2xl mb-2">2. Connect</h3>
                <p>Chat with local gamers who are interested in your trade.</p>
              </div>
            </div>
            {/* Step 3 */}
            <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
              <div class="card-body items-center text-center">
                <div class="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4 text-3xl">
                  🏪
                </div>
                <h3 class="card-title text-2xl mb-2">3. Meet Up</h3>
                <p>
                  Meet at a verified local game store to complete the swap
                  safely.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Use Us (Comparison) Section */}
      <section class="py-20 px-4 bg-neutral text-neutral-content">
        <div class="max-w-4xl mx-auto">
          <h2 class="text-4xl font-bold mb-12 text-center">
            Why Game Trades Club?
          </h2>

          <div class="overflow-x-auto">
            <table class="table table-lg text-lg">
              {/* head */}
              <thead class="text-neutral-content/60 text-lg">
                <tr>
                  <th class="w-1/3"></th>
                  <th class="text-center text-error">Generic Online Market</th>
                  <th class="text-center text-success font-bold bg-base-100/10 rounded-t-lg">
                    Game Trades Club
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* row 1 */}
                <tr>
                  <th class="font-bold">Shipping Costs</th>
                  <td class="text-center text-error/80">
                    Expensive & Variable
                  </td>
                  <td class="text-center text-success font-bold bg-base-100/5">
                    $0.00 (Always)
                  </td>
                </tr>
                {/* row 2 */}
                <tr>
                  <th class="font-bold">Risk</th>
                  <td class="text-center text-error/80">
                    Lost packages, damage
                  </td>
                  <td class="text-center text-success font-bold bg-base-100/5">
                    Inspect before listing
                  </td>
                </tr>
                {/* row 3 */}
                <tr>
                  <th class="font-bold">Waiting Time</th>
                  <td class="text-center text-error/80">Days or Weeks</td>
                  <td class="text-center text-success font-bold bg-base-100/5">
                    Instant Exchange
                  </td>
                </tr>
                {/* row 4 */}
                <tr>
                  <th class="font-bold">Community</th>
                  <td class="text-center text-error/80">Anonymous</td>
                  <td class="text-center text-success font-bold bg-base-100/5 rounded-b-lg">
                    Support Local Stores
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section class="py-24 bg-primary text-primary-content text-center">
        <div class="max-w-2xl mx-auto px-4">
          <h2 class="text-4xl font-bold mb-6">Ready to clear your shelf?</h2>
          <p class="text-xl mb-8 opacity-90">
            Join thousands of local gamers and find a new home for your board
            games today.
          </p>
          <a
            href="/list"
            class="btn btn-lg btn-active bg-white text-primary border-none hover:bg-gray-100"
          >
            Get Started for Free
          </a>
        </div>
      </section>

      <footer class="footer items-center p-4 bg-base-300 text-base-content">
        <aside class="items-center grid-flow-col">
          <p>
            Copyright © {new Date().getFullYear()}{" "}
            - All right reserved by Game Trades Club
          </p>
        </aside>
      </footer>
    </div>
  );
});
