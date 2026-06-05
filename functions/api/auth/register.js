export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const username = normalizeUsername(body.username);
    const password = typeof body.password === "string" ? body.password : "";

    if (!username) {
      return json({ message: "Username must be 3-20 letters, numbers, or underscores." }, 400);
    }

    if (password.length < 6) {
      return json({ message: "Password needs at least 6 characters." }, 400);
    }

    const config = readConfig(env);
    const email = usernameToEmail(username);

    if (config.serviceRoleKey) {
      const created = await createConfirmedUser(config, email, password, username);
      if (!created.ok) {
        return json({ message: created.message }, created.status);
      }

      const session = await signIn(config, email, password);
      if (!session.ok) {
        return json({ message: session.message }, session.status);
      }

      return json(session.payload);
    }

    const session = await signUp(config, email, password, username);
    if (!session.ok) {
      return json({ message: session.message }, session.status);
    }

    return json(session.payload);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "Registration failed." }, 500);
  }
}

function readConfig(env) {
  const url = clean(env.SUPABASE_URL ?? env.VITE_SUPABASE_URL);
  const publishableKey = clean(env.SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY);
  const serviceRoleKey = clean(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !publishableKey) {
    throw new Error("Username signup is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to Cloudflare.");
  }

  return {
    publishableKey,
    serviceRoleKey,
    url: normalizeSupabaseUrl(url)
  };
}

async function signUp(config, email, password, username) {
  const response = await fetch(new URL("/auth/v1/signup", config.url), {
    body: JSON.stringify({
      data: {
        display_name: username,
        username
      },
      email,
      password
    }),
    headers: {
      "Content-Type": "application/json",
      apikey: config.publishableKey
    },
    method: "POST"
  });

  if (!response.ok) {
    return { ok: false, message: await readAuthError(response), status: response.status };
  }

  const payload = await response.json();
  if (!payload.access_token || !payload.user?.id) {
    return {
      ok: false,
      message: "Account created, but Supabase did not return a session. Disable Confirm email for playtests or add SUPABASE_SERVICE_ROLE_KEY to Cloudflare.",
      status: 409
    };
  }

  return {
    ok: true,
    payload: {
      accessToken: payload.access_token,
      email: payload.user.email ?? null,
      userId: payload.user.id
    }
  };
}

async function createConfirmedUser(config, email, password, username) {
  const response = await fetch(new URL("/auth/v1/admin/users", config.url), {
    body: JSON.stringify({
      email,
      email_confirm: true,
      password,
      user_metadata: {
        display_name: username,
        username
      }
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey
    },
    method: "POST"
  });

  if (response.ok) {
    return { ok: true };
  }

  const message = await readAuthError(response);
  if (/already|registered|exists/i.test(message)) {
    return { ok: false, message: "Username already exists. Sign in instead.", status: 409 };
  }

  return { ok: false, message, status: response.status };
}

async function signIn(config, email, password) {
  const endpoint = new URL("/auth/v1/token", config.url);
  endpoint.searchParams.set("grant_type", "password");
  const response = await fetch(endpoint, {
    body: JSON.stringify({ email, password }),
    headers: {
      "Content-Type": "application/json",
      apikey: config.publishableKey
    },
    method: "POST"
  });

  if (!response.ok) {
    return { ok: false, message: await readAuthError(response), status: response.status };
  }

  const payload = await response.json();
  if (!payload.access_token || !payload.user?.id) {
    return { ok: false, message: "Supabase did not return a session for this username.", status: 502 };
  }

  return {
    ok: true,
    payload: {
      accessToken: payload.access_token,
      email: payload.user.email ?? null,
      userId: payload.user.id
    }
  };
}

function normalizeUsername(value) {
  const normalized = clean(value).toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(normalized) ? normalized : "";
}

function usernameToEmail(username) {
  return `${username}@players.ember-dossier.example.com`;
}

function normalizeSupabaseUrl(value) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).origin;
}

function clean(value) {
  return typeof value === "string" ? value.replace(/^\uFEFF/, "").trim() : "";
}

async function readAuthError(response) {
  const text = await response.text();
  try {
    const payload = JSON.parse(text);
    return payload.message ?? payload.msg ?? payload.error_description ?? payload.error ?? text;
  } catch {
    return text || `Supabase request failed with HTTP ${response.status}`;
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status
  });
}
