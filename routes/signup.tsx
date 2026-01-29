import { define } from "../utils.ts";
import SignUpForm from "../islands/SignUpForm.tsx";

export default define.page(function SignUpPage(ctx) {
  ctx.state.title = "Sign Up - Game Trades Club";

  return (
    <div class="min-h-screen bg-linear-to-br from-base-300 via-base-100 to-base-300 py-16 px-4">
      <div class="max-w-lg mx-auto">
        {/* Header */}
        <div class="text-center mb-10">
          <a href="/" class="inline-block mb-6">
            <span class="text-4xl">🎲</span>
          </a>
          <h1 class="text-3xl font-bold mb-2">Join Game Trades Club</h1>
          <p class="text-base-content/70">
            Start trading board games with local players today
          </p>
        </div>

        {/* Sign Up Form */}
        <SignUpForm />

        {/* Benefits */}
        <div class="mt-12 grid grid-cols-3 gap-4 text-center">
          <div class="p-4">
            <div class="text-2xl mb-2">🚫📦</div>
            <p class="text-sm text-base-content/60">No shipping</p>
          </div>
          <div class="p-4">
            <div class="text-2xl mb-2">🏪</div>
            <p class="text-sm text-base-content/60">Local meetups</p>
          </div>
          <div class="p-4">
            <div class="text-2xl mb-2">🤝</div>
            <p class="text-sm text-base-content/60">Safe trades</p>
          </div>
        </div>
      </div>
    </div>
  );
});
