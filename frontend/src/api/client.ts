import { supabase } from '../lib/supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

interface FetchOptions extends RequestInit {
  token?: string | null;
}

interface ErrorBody {
  error?: { message?: string };
}

/** Same shape for every failed call: `message` from the contract's error body, plus `status` and `data`. */
function httpError(status: number, json: ErrorBody | null): Error {
  const message = json?.error?.message ?? `HTTP ${status}`;
  return Object.assign(new Error(message), { status, data: json });
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = options.token !== undefined ? options.token : await getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw httpError(res.status, json);
  }

  return res.json();
}

/** Long enough for a ~1 MB photo on slow venue Wi-Fi. */
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Multipart POST through React Native's XMLHttpRequest. Since SDK 58 the global `fetch` is
 * `expo/fetch`, which can't send React Native's `{ uri, name, type }` file parts ("Unsupported
 * FormDataPart implementation"). XHR uses React Native's own networking, which streams the file
 * from its local uri. Don't set Content-Type: the boundary is added automatically.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.onload = () => {
      let json: unknown = null;
      try { json = JSON.parse(xhr.responseText); } catch { /* not JSON: handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && json) resolve(json as T);
      else reject(httpError(xhr.status, json as ErrorBody | null));
    };
    xhr.onerror = () => reject(new Error("Can't reach the server. Check your connection and try again."));
    xhr.ontimeout = () => reject(new Error('The upload timed out. Check your connection and try again.'));
    xhr.send(formData);
  });
}

