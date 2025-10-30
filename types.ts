import type { Chat } from "@google/genai";

export interface RssItem {
  id: string; // Case ID extracted from the link
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface CaseDocument {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
}

export interface ApiCase {
  id: number;
  caseNumber: string;
  name: string;
  institution: string;
  statusName: string;
  description: string;
  commentDeadline: string;
  created: string;
  documents: CaseDocument[];
  contactName?: string;
  contactEmail?: string;
}

export interface CaseComment {
    id: number;
    caseId: number;
    contact: string;
    comment: string;
    created: string;
    attachments: {
        id: string;
        name: string;
        fileType: string;
    }[];
}

export interface ConsultationAnalysis {
    summary: string;
    reviewers: string[];
    mainPoints: string[];
}

export interface CaseDetails {
  summary: string;
  keyPoints: string[];
  questionsForMinister: string[];
  consultationAnalysis: ConsultationAnalysis;
  policyAnalysis: string;
  speechDraft: string;
}

export interface GroundingSource {
  web?: {
    uri: string;
    title: string;
  }
}

export interface AlthingiStatus {
  description: string;
  sources: GroundingSource[];
}

export interface AlthingiReview {
  reviewer: string;
  stance: 'Jákvæð' | 'Neikvæð' | 'Hlutlaus' | string; // Allow string for flexibility from AI
  summary: string;
}

export interface AlthingiReviewAnalysis {
  analysisSummary: string;
  reviews: AlthingiReview[];
  sources: GroundingSource[];
}


export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/**
 * A structured response object returned by the API client for every request.
 * This prevents the need for fragile try/catch blocks for handling HTTP errors
 * like 404, which was the root cause of a recurring bug.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  status: number;
  error?: {
    message: string;
    body: string;
  };
}
