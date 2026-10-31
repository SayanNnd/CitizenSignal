import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/** Supabase puts tokens in the URL fragment (implicit flow) or a code in the query (PKCE); errors can be in either. */
function parseAuthParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const [beforeHash, hash] = url.split('#');
  const query = beforeHash.split('?')[1];
  for (const part of [query, hash]) {
    if (part) new URLSearchParams(part).forEach((value, key) => { out[key] = value; });
  }
  return out;
}

export interface GoogleResult {
  error: string | null;
  /** True when the user closed the browser without finishing; not an error. */
  cancelled?: boolean;
}

/**
 * Browser OAuth flow (works in Expo Go; native Google Sign-In would need a dev build).
 * Supabase returns tokens in the redirect URL; after setSession the rest of the app
 * just sees a normal Supabase session and sends `Authorization: Bearer <access_token>`.
 */
export async function signInWithGoogleBrowser(): Promise<GoogleResult> {
  try {
    const redirectTo = makeRedirectUri(); // exp://<ip>:8081 in Expo Go
    // Supabase must accept this exact URL in Auth → URL Configuration → Redirect URLs,
    // otherwise it falls back to the Site URL (http://localhost:3000 by default) after Google.
    if (__DEV__) console.log('[google sign-in] redirectTo =', redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // select_account makes Google show the account chooser instead of silently reusing the signed-in one
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error || !data.url) return { error: error?.message ?? 'Could not start Google sign-in.' };

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== 'success') return { error: null, cancelled: true };

    const params = parseAuthParams(res.url);
    if (params.error || params.error_code) {
      return { error: params.error_description ?? params.error_code ?? params.error };
    }

    // Default (implicit) flow returns tokens; a client configured with flowType 'pkce' returns a code.
    if (params.code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
      return { error: exchangeError?.message ?? null };
    }
    if (params.access_token && params.refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      return { error: sessionError?.message ?? null };
    }
    return { error: 'Google sign-in did not return a session. Try again or use email.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Google sign-in failed.' };
  }
}
