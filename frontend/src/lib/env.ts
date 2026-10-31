/**
 * Mock DATA mode is ON unless EXPO_PUBLIC_USE_MOCK=false, so the UI runs with no backend.
 * Flip it to `false` in frontend/.env to talk to the real API.
 */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

/** True when the Supabase URL and anon key are set in frontend/.env. */
export const HAS_SUPABASE = !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Login goes through the backend (`POST /api/auth/login`), so with mock data (no backend) or no
 * Supabase config, the login form signs in a fake user with whatever email was typed.
 */
export const USE_MOCK_AUTH = USE_MOCK || !HAS_SUPABASE;
