import type { ApiResponse } from '../types';

const CORS_PROXY_URL = 'https://corsproxy.io/?';
export const API_BASE_URL = 'https://samradapi.island.is';

interface RequestParams {
  [key: string]: string | number;
}

/**
 * A centralized, robust API client to handle all external requests.
 * This abstracts away the complexity of using a CORS proxy and provides
 * a single point for configuration and error handling.
 *
 * FIX: This client has been re-architected to be more resilient. Instead of
 * throwing errors on non-200 HTTP responses, it now returns a structured
 * `ApiResponse` object. This allows callers to deterministically check the
 * `status` and `success` fields, eliminating fragile `try...catch` blocks
 * for predictable API behaviors (like a 404 for an empty list).
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
   * @returns A promise that resolves to an ApiResponse object.
   */
  public async get<T>(endpoint: string, params: RequestParams = {}): Promise<ApiResponse<T>> {
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
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const errorMessage = `Villa í netsamskiptum við vefþjónustu (HTTP ${response.status}).`;
        console.error(`HTTP error! status: ${response.status}, endpoint: ${endpoint}, body: ${errorBody}`);
        return {
          success: false,
          data: null,
          status: response.status,
          error: { message: errorMessage, body: errorBody },
        };
      }

      const data = await response.json() as T;
      return {
        success: true,
        data: data,
        status: response.status,
      };

    } catch (error: any) {
      console.error(`Network or fetch error for endpoint ${endpoint}:`, error);
      const errorMessage = 'Ekki tókst að ná sambandi við vefþjónustu. Athugaðu netenginguna þína.';
      return {
        success: false,
        data: null,
        status: 0, // Use 0 to indicate a network-level failure
        error: { message: errorMessage, body: error.message },
      };
    }
  }

  /**
   * Performs a POST request, typically via the CORS proxy.
   * @param url - The full target URL for the POST request.
   * @param body - The JSON body for the request.
   * @returns A promise that resolves to an ApiResponse object.
   */
  public async post<T>(url: string, body: any): Promise<ApiResponse<T>> {
    const finalApiUrl = `${this.proxyUrl}${url}`;

    try {
      const response = await fetch(finalApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const errorMessage = `Villa í netsamskiptum við vefþjónustu (HTTP ${response.status}).`;
        console.error(`HTTP error! status: ${response.status}, url: ${url}, body: ${errorBody}`);
        return {
          success: false,
          data: null,
          status: response.status,
          error: { message: errorMessage, body: errorBody },
        };
      }

      const data = await response.json() as T;
      return {
        success: true,
        data: data,
        status: response.status,
      };

    } catch (error: any) {
      console.error(`Network or fetch error for url ${url}:`, error);
      const errorMessage = 'Ekki tókst að ná sambandi við vefþjónustu. Athugaðu netenginguna þína.';
      return {
        success: false,
        data: null,
        status: 0, // Use 0 to indicate a network-level failure
        error: { message: errorMessage, body: error.message },
      };
    }
  }
}

// Export a singleton instance of the client for use across the app.
export const apiClient = new ApiClient(CORS_PROXY_URL, API_BASE_URL);