/** These two values are deliberately public. Authorization comes from RLS. */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.');
  }
  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new Error('Supabase clients require a publishable key (sb_publishable_).');
  }
  return { url, publishableKey };
}
