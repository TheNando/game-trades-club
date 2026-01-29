/// <reference lib="deno.unstable" />

// Deno KV database utilities for user management

let kv: Deno.Kv | null = null;

export async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

/**
 * Hash a password using Web Crypto API with PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));

  const salt = combined.slice(0, 16);
  const storedHashBytes = combined.slice(16);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const newHashBytes = new Uint8Array(derivedBits);

  if (newHashBytes.length !== storedHashBytes.length) {
    return false;
  }

  for (let i = 0; i < newHashBytes.length; i++) {
    if (newHashBytes[i] !== storedHashBytes[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getKv();
  const result = await db.get<User>(["users_by_email", email.toLowerCase()]);
  return result.value;
}

/**
 * Get user by username
 */
export async function getUserByUsername(
  username: string,
): Promise<User | null> {
  const db = await getKv();
  const result = await db.get<User>([
    "users_by_username",
    username.toLowerCase(),
  ]);
  return result.value;
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string; user?: User; }> {
  const db = await getKv();

  // Check for existing email
  const existingEmail = await getUserByEmail(email);
  if (existingEmail) {
    return { success: false, error: "Email already registered" };
  }

  // Check for existing username
  const existingUsername = await getUserByUsername(username);
  if (existingUsername) {
    return { success: false, error: "Username already taken" };
  }

  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();

  const user: User = {
    id,
    email: email.toLowerCase(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  // Store user with atomic transaction
  const result = await db
    .atomic()
    .check({ key: ["users_by_email", email.toLowerCase()], versionstamp: null })
    .check({
      key: ["users_by_username", username.toLowerCase()],
      versionstamp: null,
    })
    .set(["users", id], user)
    .set(["users_by_email", email.toLowerCase()], user)
    .set(["users_by_username", username.toLowerCase()], user)
    .commit();

  if (!result.ok) {
    return {
      success: false,
      error: "Failed to create user. Please try again.",
    };
  }

  // Return user without password hash
  const { passwordHash: _, ...safeUser } = user;
  return { success: true, user: safeUser as User };
}
