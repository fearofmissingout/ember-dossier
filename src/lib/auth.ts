import { supabaseConfig } from "./supabase";

export type AuthSession = {
  accessToken: string;
  email: string | null;
  userId: string;
};

export async function requestMagicLink(email: string) {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(new URL("/auth/v1/otp", supabaseConfig.url), {
    body: JSON.stringify({
      create_user: true,
      email,
      type: "magiclink"
    }),
    headers: authHeaders(),
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
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
