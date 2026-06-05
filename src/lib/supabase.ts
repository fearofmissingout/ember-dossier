const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabasePublishableKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined
)?.trim();

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const supabaseConfig = hasSupabaseConfig
  ? {
      publishableKey: supabasePublishableKey as string,
      url: supabaseUrl as string
    }
  : null;

function normalizeSupabaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
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
