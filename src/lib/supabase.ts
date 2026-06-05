const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabasePublishableKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined
);
const cleanSupabasePublishableKey = cleanEnvValue(supabasePublishableKey);

export const hasSupabaseConfig = Boolean(supabaseUrl && cleanSupabasePublishableKey);

export const supabaseConfig = hasSupabaseConfig
  ? {
      publishableKey: cleanSupabasePublishableKey,
      url: supabaseUrl as string
    }
  : null;

function normalizeSupabaseUrl(value: string | undefined) {
  const trimmed = cleanEnvValue(value);
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return trimmed;
  }
}

function cleanEnvValue(value: string | undefined) {
  return value?.replace(/^\uFEFF/, "").trim() ?? "";
}
