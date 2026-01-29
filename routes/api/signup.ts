import { define } from "../../utils.ts";
import { createUser } from "../../utils/db.ts";

function isValidEmail(email: string) {
  return typeof email === "string" && email.includes("@");
}

function isValidUsernameLength(username: string) {
  return typeof username === "string" && username.length >= 3 &&
    username.length <= 20;
}

function isValidUsernameCharacters(username: string) {
  return /^[a-zA-Z0-9_]+$/.test(username);
}

function isValidPasswordLength(password: string) {
  return typeof password === "string" && password.length >= 8;
}

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const body = await ctx.req.json();
      const { email, username, password } = body;

      // Validation
      if (!isValidEmail) {
        return new Response(
          JSON.stringify({ error: "Valid email is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (!isValidUsernameLength) {
        return new Response(
          JSON.stringify({
            error: "Username must be between 3 and 20 characters",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (!isValidUsernameCharacters) {
        return new Response(
          JSON.stringify({
            error:
              "Username can only contain letters, numbers, and underscores",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (!isValidPasswordLength) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const result = await createUser(email, username, password);

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created successfully!",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Signup error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
