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
    const params = {
      pageSize: '1500',
      orderBy: 'LastUpdated',
    };

    const response = await apiClient.get<CaseSearchResponse>('/api/cases', params);
    
    if (!response.success) {
      console.error('Error in searchCases service:', response.error);
      throw new Error('Gat ekki sótt málalista.');
    }
    
    return response.data?.cases || [];

  } catch (error) {
    console.error('Error processing searchCases:', error);
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
  
  const response = await apiClient.get<ApiCase>(`/api/cases/${id}`);

  if (!response.success) {
      console.error(`Error in fetchCaseById service for ID ${id}:`, response.error);
      throw new Error(`Gat ekki sótt mál með ID: ${id}.`);
  }
  
  if (!response.data) {
      throw new Error(`Ekkert mál fannst með ID: ${id}.`);
  }
  
  return response.data;
};

// The GraphQL query to get comments for a case.
// FIX: The query has been updated to use the 'caseAdvices' field. All previous
// attempts ('advice', 'advices', 'adviceList') have been invalidated by the API.
const GET_CASE_COMMENTS_QUERY = `
query ConsultationPortalCaseById($input: ConsultationPortalCaseInput!) {
  consultationPortalCaseById(input: $input) {
    caseAdvices {
      id
      participantName
      content
      created
      adviceFiles {
        id
        name
      }
    }
  }
}
`;

// Helper type for the raw GraphQL response.
interface GraphQLAdvice {
  id: number;
  participantName: string;
  content: string;
  created: string;
  adviceFiles: { id: string; name: string; }[];
}

interface GraphQLResponse {
  data: {
    consultationPortalCaseById: {
      caseAdvices: GraphQLAdvice[];
    }
  }
}

/**
 * Maps the data structure from the GraphQL API to the app's internal CaseComment type.
 */
const mapGraphQLAdviceToCaseComment = (advice: GraphQLAdvice, caseId: number): CaseComment => ({
  id: advice.id,
  caseId: caseId,
  contact: advice.participantName,
  comment: advice.content || "Engin athugasemd fylgdi.", // Handle empty comments from API
  created: advice.created,
  attachments: advice.adviceFiles.map(file => ({
    id: file.id,
    name: file.name,
    fileType: file.name.split('.').pop() || '', // Heuristic to get file type
  })),
});

/**
 * Fetches all comments (submissions) for a specific case.
 *
 * This function has been updated to use the island.is GraphQL API, which is
 * what the public-facing website uses. This approach is more reliable for
 * fetching comments than the previous REST endpoint, which was found to be
 * inconsistent for some cases.
 *
 * @param id - The ID of the case.
 * @returns A promise that resolves to an array of CaseComment.
 */
export const fetchCaseComments = async (id: string): Promise<CaseComment[]> => {
    const graphqlApiUrl = 'https://island.is/api/graphql';
    const caseIdInt = parseInt(id, 10);

    if (isNaN(caseIdInt)) {
        const error = new Error("A valid numeric case ID is required.");
        console.error(error);
        throw error;
    }

    const body = {
        operationName: 'ConsultationPortalCaseById',
        variables: {
            input: {
                caseId: caseIdInt,
            },
        },
        query: GET_CASE_COMMENTS_QUERY,
    };

    const response = await apiClient.post<GraphQLResponse>(graphqlApiUrl, body);

    if (!response.success) {
        console.error(`Error in fetchCaseComments (GraphQL) service for ID ${id}:`, response.error);
        throw new Error('Gat ekki sótt umsagnir fyrir mál.');
    }

    const caseAdvicesResult = response.data?.data?.consultationPortalCaseById?.caseAdvices;
    
    if (!caseAdvicesResult) {
        // This handles cases with no comments or if the API response structure is unexpected.
        return [];
    }

    return caseAdvicesResult.map(advice => mapGraphQLAdviceToCaseComment(advice, caseIdInt));
};