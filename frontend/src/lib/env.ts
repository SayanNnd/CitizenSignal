/**
 * Mock mode is ON unless EXPO_PUBLIC_USE_MOCK=false, so the UI runs with no backend
 * and no Supabase project. Flip it to `false` in frontend/.env once the API is ready.
 */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';
