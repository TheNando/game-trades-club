import { useSignal } from "@preact/signals";

export default function SignUpForm() {
  const email = useSignal("");
  const username = useSignal("");
  const password = useSignal("");
  const confirmPassword = useSignal("");
  const error = useSignal("");
  const success = useSignal(false);
  const loading = useSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    error.value = "";

    // Client-side validation
    if (!email.value || !email.value.includes("@")) {
      error.value = "Please enter a valid email address";
      return;
    }

    if (username.value.length < 3 || username.value.length > 20) {
      error.value = "Username must be between 3 and 20 characters";
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.value)) {
      error.value =
        "Username can only contain letters, numbers, and underscores";
      return;
    }

    if (password.value.length < 8) {
      error.value = "Password must be at least 8 characters";
      return;
    }

    if (password.value !== confirmPassword.value) {
      error.value = "Passwords do not match";
      return;
    }

    loading.value = true;

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          username: username.value,
          password: password.value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        error.value = data.error || "Something went wrong";
        return;
      }

      success.value = true;
    } catch (_err) {
      error.value = "Failed to connect to server";
    } finally {
      loading.value = false;
    }
  };

  if (success.value) {
    return (
      <div class="card bg-base-200 shadow-2xl max-w-md mx-auto">
        <div class="card-body text-center">
          <div class="text-6xl mb-4">🎉</div>
          <h2 class="card-title justify-center text-2xl text-success mb-2">
            Welcome to Game Trades Club!
          </h2>
          <p class="text-base-content/70 mb-6">
            Your account has been created successfully.
          </p>
          <a href="/" class="btn btn-primary">
            Start Trading Games
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      class="card bg-base-200 shadow-2xl max-w-md mx-auto"
    >
      <div class="card-body">
        <h2 class="card-title text-2xl justify-center mb-6">
          Create Your Account
        </h2>

        {error.value && (
          <div class="alert alert-error mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error.value}</span>
          </div>
        )}

        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Email</span>
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            class="input input-bordered w-full"
            value={email.value}
            onInput={(e) => (email.value = (e.target as HTMLInputElement).value)}
            required
          />
        </div>

        <div class="form-control mt-3">
          <label class="label">
            <span class="label-text font-medium">Username</span>
          </label>
          <input
            type="text"
            placeholder="gamer_legend"
            class="input input-bordered w-full"
            value={username.value}
            onInput={(e) => (username.value = (e.target as HTMLInputElement).value)}
            required
            minLength={3}
            maxLength={20}
          />
          <label class="label">
            <span class="label-text-alt text-base-content/60">
              3-20 characters, letters, numbers, underscores only
            </span>
          </label>
        </div>

        <div class="form-control mt-3">
          <label class="label">
            <span class="label-text font-medium">Password</span>
          </label>
          <input
            type="password"
            placeholder="••••••••"
            class="input input-bordered w-full"
            value={password.value}
            onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
            required
            minLength={8}
          />
          <label class="label">
            <span class="label-text-alt text-base-content/60">
              At least 8 characters
            </span>
          </label>
        </div>

        <div class="form-control mt-3">
          <label class="label">
            <span class="label-text font-medium">Confirm Password</span>
          </label>
          <input
            type="password"
            placeholder="••••••••"
            class="input input-bordered w-full"
            value={confirmPassword.value}
            onInput={(e) => (confirmPassword.value = (e.target as HTMLInputElement).value)}
            required
          />
        </div>

        <button
          type="submit"
          class={`btn btn-primary mt-6 ${loading.value ? "loading" : ""}`}
          disabled={loading.value}
        >
          {loading.value ? <span class="loading loading-spinner"></span> : (
            "Create Account"
          )}
        </button>

        <p class="text-center mt-4 text-base-content/70">
          Already have an account?{" "}
          <a href="/login" class="link link-primary">
            Sign in
          </a>
        </p>
      </div>
    </form>
  );
}
