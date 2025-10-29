import { apiClient } from './apiClient';
import type { RssItem, ApiCase, CaseComment } from '../types';

interface CaseSearchResponse {
  cases: ApiCase[];
  total: number;
}

/**
 * Fetches a comprehensive list of cases from the API.
 * This function now fetches a large set of cases to enable client-side searching and filtering,
 * making the UI more responsive and reliable.
 * @returns A promise that resolves to an array of ApiCase.
 */
export const searchCases = async (): Promise<ApiCase[]> => {
  try {
    // Fetch a large number of cases to perform client-side filtering.
    // The 'LastUpdated' order is a sensible default for the initial fetch.
    const params = {
      pageSize: '1500',
      orderBy: 'LastUpdated',
    };

    const data = await apiClient.get<CaseSearchResponse>('/api/cases', params);
    
    return data.cases || [];

  } catch (error) {
    console.error('Error in searchCases service:', error);
    // Re-throw the error to be handled by the UI component
    throw error;
  }
};


/**
 * Fetches a single case by its ID using the centralized API client.
 * @param id - The ID of the case to fetch.
 * @returns A promise that resolves to the detailed ApiCase object.
 */
export const fetchCaseById = async (id: string): Promise<ApiCase> => {
  if (!id) {
    const error = new Error("A valid case ID is required.");
    console.error(error);
    throw error;
  }
  
  try {
    const apiCase = await apiClient.get<ApiCase>(`/api/cases/${id}`);
    return apiCase;
  } catch (error)
  {
    console.error(`Error in fetchCaseById service for ID ${id}:`, error);
    // Re-throw the error to be handled by the UI component
    throw error;
  }
};

/**
 * Fetches all comments (submissions) for a specific case.
 * @param id - The ID of the case.
 * @returns A promise that resolves to an array of CaseComment.
 */
export const fetchCaseComments = async (id: string): Promise<CaseComment[]> => {
    try {
        const comments = await apiClient.get<CaseComment[]>(`/api/cases/${id}/submissions`);
        
        return comments || [];
    } catch (error: any) {
        // FIX: The `instanceof HttpError` check proved unreliable in this module environment.
        // It has been replaced with a more robust property check ("duck typing"). This
        // now reliably identifies a 404 error by checking for `error.status === 404`,
        // correctly handling the API's behavior of returning a 404 for cases with no
        // submissions by treating it as an empty list.
        if (error && error.status === 404) {
            console.warn(`Caught a 404 for case ${id} submissions, returning empty array. This is expected for cases with no comments.`);
            return []; // Treat 404 as an empty list of comments.
        }

        // For any other error, log it and re-throw a user-friendly message.
        console.error(`Error in fetchCaseComments service for ID ${id}:`, error);
        throw new Error('Gat ekki sótt umsagnir fyrir mál.');
    }
};