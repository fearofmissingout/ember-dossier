import { supabaseConfig } from "./supabase";

export type AuthSession = {
  accessToken: string;
  email: string | null;
  userId: string;
};

export function normalizePlaytestUsername(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(normalized) ? normalized : "";
}

export function isEmailLogin(value: string): boolean {
  return value.includes("@");
}

export function usernameToPlaytestEmail(username: string): string {
  return `${normalizePlaytestUsername(username)}@players.ember-dossier.example.com`;
}

const emailConfirmationRequiredMessage =
  "账号已创建，但 Supabase 仍要求邮箱确认。请去邮箱点击确认链接，或先点 Continue as guest 试玩；如果想注册后立刻进入，请在 Supabase Auth 里关闭 Confirm email。";

type EmailOtpType = "email" | "magiclink" | "signup" | "recovery" | "invite" | "email_change";

export async function requestMagicLink(email: string) {
  if (!supabaseConfig) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = new URL("/auth/v1/otp", supabaseConfig.url);
  addCurrentPageRedirect(endpoint);

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

  const endpoint = new URL("/auth/v1/signup", supabaseConfig.url);
  addCurrentPageRedirect(endpoint);

  const response = await fetch(endpoint, {
    body: JSON.stringify({ email, password }),
    headers: authHeaders(),
    method: "POST"
  });

  return readAuthSessionResponse(response, emailConfirmationRequiredMessage);
}

export async function signUpWithUsername(username: string, password: string): Promise<AuthSession> {
  const normalizedUsername = normalizePlaytestUsername(username);
  if (!normalizedUsername) {
    throw new Error("Username must be 3-20 letters, numbers, or underscores.");
  }

  const response = await fetch("/api/auth/register", {
    body: JSON.stringify({
      password,
      username: normalizedUsername
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return readPlaytestSignupResponse(response);
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

export async function signInWithUsername(username: string, password: string): Promise<AuthSession> {
  const normalizedUsername = normalizePlaytestUsername(username);
  if (!normalizedUsername) {
    throw new Error("Username must be 3-20 letters, numbers, or underscores.");
  }

  return signInWithPassword(usernameToPlaytestEmail(normalizedUsername), password);
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

function addCurrentPageRedirect(endpoint: URL) {
  if (typeof window !== "undefined") {
    endpoint.searchParams.set("redirect_to", window.location.href);
  }
}

async function readAuthSessionResponse(response: Response, emptySessionMessage: string): Promise<AuthSession> {
  if (!response.ok) {
    throw new Error(await readAuthError(response));
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

async function readPlaytestSignupResponse(response: Response): Promise<AuthSession> {
  if (!response.ok) {
    throw new Error(await readAuthError(response));
  }

  const payload = (await response.json()) as Partial<AuthSession>;
  if (!payload.accessToken || !payload.userId) {
    throw new Error("Username signup did not return a session.");
  }

  return {
    accessToken: payload.accessToken,
    email: payload.email ?? null,
    userId: payload.userId
  };
}

async function readAuthError(response: Response) {
  const text = await response.text();
  try {
    const payload = JSON.parse(text) as { error?: string; error_description?: string; msg?: string; message?: string };
    return payload.message ?? payload.msg ?? payload.error_description ?? payload.error ?? text;
  } catch {
    return text;
  }
}
