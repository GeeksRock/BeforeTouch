import { createBrowserClient } from '@supabase/ssr'

// The one browser Supabase client. Cookie-aware, so the server and
// middleware see the same session. Sessions are never established from
// URLs implicitly — /set-password verifies its token explicitly.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { detectSessionInUrl: false } },
)
