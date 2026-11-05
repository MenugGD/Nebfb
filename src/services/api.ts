/**
 * Safe API Client with HTML/Non-JSON response protection
 * Prevents "Unexpected token 'T', 'The page could not be found' is not valid JSON" errors
 */

export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    // Check if the response is HTML or plain non-JSON text
    if (!contentType.includes('application/json') || text.trim().startsWith('<') || text.startsWith('The page')) {
      console.warn(`[safeFetchJson]: Server returned non-JSON/HTML for ${url}`);
      return null;
    }

    try {
      const data = JSON.parse(text);
      if (!res.ok) {
        console.warn(`[safeFetchJson HTTP ${res.status}]:`, data.error || res.statusText);
        return null;
      }
      return data as T;
    } catch (parseErr: any) {
      console.warn(`[safeFetchJson parse error for ${url}]:`, parseErr.message);
      return null;
    }
  } catch (err: any) {
    console.warn(`[safeFetchJson network error for ${url}]:`, err.message);
    return null;
  }
}
