/**
 * Safe API Client with HTML/Non-JSON response protection
 * Prevents "Unexpected token 'T', 'The page could not be found' is not valid JSON" errors
 */

export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    // Check if the response is HTML or plain non-JSON text
    if (!contentType.includes('application/json') || text.trim().startsWith('<') || text.startsWith('The page')) {
      throw new Error(`Server returned HTML instead of JSON: ${text.substring(0, 50)}...`);
    }

    const data = JSON.parse(text);
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return data as T;
  } catch (err: any) {
    console.warn(`[safeFetchJson warning for ${url}]:`, err.message);
    throw err;
  }
}
