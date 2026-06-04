const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
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
