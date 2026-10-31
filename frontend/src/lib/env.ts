/**
 * Mock DATA mode is ON unless EXPO_PUBLIC_USE_MOCK=false, so the UI runs with no backend.
 * Flip it to `false` in frontend/.env to talk to the real API.
 */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

/** True when the Supabase URL and anon key are set in frontend/.env. */
export const HAS_SUPABASE = !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Login is real whenever Supabase is configured, even with mock data, so Google sign-in
 * behaves for real. Only with no Supabase config does it fall back to an instant fake user.
 */
export const USE_MOCK_AUTH = !HAS_SUPABASE;
