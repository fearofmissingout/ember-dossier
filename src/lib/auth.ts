import { supabaseConfig } from "./supabase";

export type AuthSession = {
  accessToken: string;
  email: string | null;
  userId: string;
};

type EmailOtpType = "email" | "magiclink" | "signup" | "recovery" | "invite" | "email_change";

export async function requestMagicLink(email: string) {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = new URL("/auth/v1/otp", supabaseConfig.url);
  if (typeof window !== "undefined") {
    endpoint.searchParams.set("redirect_to", window.location.href);
  }

  const response = await fetch(endpoint, {
    body: JSON.stringify({
      create_user: true,
      email
    }),
    headers: authHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function signUpWithPassword(email: string, password: string): Promise<AuthSession> {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(new URL("/auth/v1/signup", supabaseConfig.url), {
    body: JSON.stringify({ email, password }),
    headers: authHeaders(),
    method: "POST"
  });

  return readAuthSessionResponse(response, "Supabase did not return a session. If email confirmations are enabled, confirm the account first or disable confirmation for playtests.");
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = new URL("/auth/v1/token", supabaseConfig.url);
  endpoint.searchParams.set("grant_type", "password");

  const response = await fetch(endpoint, {
    body: JSON.stringify({ email, password }),
    headers: authHeaders(),
    method: "POST"
  });

  return readAuthSessionResponse(response, "Supabase did not return a session for this email and password.");
}

export function readSessionFromHash(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const userId = params.get("user_id") ?? params.get("sub");

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    email: params.get("email"),
    userId: userId ?? ""
  };
}

export function readTokenHashFromUrl(): { tokenHash: string; type: EmailOtpType } | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) {
    return null;
  }

  return { tokenHash, type };
}

export async function verifyTokenHash(tokenHash: string, type: EmailOtpType): Promise<AuthSession> {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(new URL("/auth/v1/verify", supabaseConfig.url), {
    body: JSON.stringify({
      token_hash: tokenHash,
      type
    }),
    headers: authHeaders(),
    method: "POST"
  });

  return readAuthSessionResponse(response, "Supabase did not return a session for this email link.");
}

export async function fetchAuthUser(accessToken: string): Promise<AuthSession> {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(new URL("/auth/v1/user", supabaseConfig.url), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseConfig.publishableKey
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const user = (await response.json()) as { email?: string; id: string };
  return {
    accessToken,
    email: user.email ?? null,
    userId: user.id
  };
}

function authHeaders() {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  return {
    "Content-Type": "application/json",
    apikey: supabaseConfig.publishableKey
  };
}

async function readAuthSessionResponse(response: Response, emptySessionMessage: string): Promise<AuthSession> {
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as {
    access_token?: string;
    user?: {
      email?: string;
      id: string;
    };
  };

  if (!payload.access_token || !payload.user?.id) {
    throw new Error(emptySessionMessage);
  }

  return {
    accessToken: payload.access_token,
    email: payload.user.email ?? null,
    userId: payload.user.id
  };
}
