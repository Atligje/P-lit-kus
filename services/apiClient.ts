
const CORS_PROXY_URL = 'https://corsproxy.io/?';
export const API_BASE_URL = 'https://samradapi.island.is';

interface RequestParams {
  [key: string]: string | number;
}

// FIX: Added a custom error class to provide structured error information,
// including the HTTP status code. This allows for more robust error handling
// than relying on string matching in error messages.
export class HttpError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * A centralized API client to handle all external requests.
 * This abstracts away the complexity of using a CORS proxy and provides
 * a single point for configuration and error handling.
 */
class ApiClient {
  private proxyUrl: string;
  private baseUrl: string;

  constructor(proxyUrl: string, baseUrl: string) {
    this.proxyUrl = proxyUrl;
    this.baseUrl = baseUrl;
  }

  /**
   * Performs a GET request to the API via the CORS proxy.
   * @param endpoint - The API endpoint to call (e.g., '/api/cases').
   * @param params - An object of query parameters to append to the URL.
   * @returns The JSON response from the API.
   */
  public async get<T>(endpoint: string, params: RequestParams = {}): Promise<T> {
    const query = new URLSearchParams();
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        query.append(key, String(params[key]));
      }
    }

    const queryString = query.toString();
    const targetUrl = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    const finalApiUrl = `${this.proxyUrl}${targetUrl}`;

    try {
      const response = await fetch(finalApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          // Add anti-caching headers to force the proxy to fetch a fresh response
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const errorMessage = `Villa í netsamskiptum við vefþjónustu (HTTP ${response.status}).`;
        console.error(`HTTP error! status: ${response.status}, endpoint: ${endpoint}, body: ${errorBody}`);
        // FIX: Throw the new custom error to provide more context to the caller.
        throw new HttpError(errorMessage, response.status, errorBody);
      }

      return await response.json() as T;

    } catch (error) {
      console.error(`Network or fetch error for endpoint ${endpoint}:`, error);
      // FIX: Improved error re-throwing logic. If it's our custom HttpError,
      // re-throw it directly. Otherwise, wrap it in a generic network error message.
      if (error instanceof HttpError) {
         throw error;
      }
      throw new Error('Ekki tókst að ná sambandi við vefþjónustu. Athugaðu netenginguna þína.');
    }
  }
}

// Export a singleton instance of the client for use across the app.
export const apiClient = new ApiClient(CORS_PROXY_URL, API_BASE_URL);
