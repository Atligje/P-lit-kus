// src/services/cases.ts
import { apiClient } from './apiClient'
import type { ApiCase, CaseComment } from '../types'

interface CaseSearchResponse { cases: ApiCase[]; total: number }

export const searchCases = async (): Promise<ApiCase[]> => {
  const params = { pageSize: '1500', orderBy: 'LastUpdated' }
  const res = await apiClient.get<CaseSearchResponse>('/api/cases', params)
  if (!res.success) throw new Error('Gat ekki sótt málalista.')
  return res.data?.cases || []
}

export const fetchCaseById = async (id: string): Promise<ApiCase> => {
  if (!id) throw new Error('A valid case ID is required.')
  const res = await apiClient.get<ApiCase>(`/api/cases/${id}`)
  if (!res.success) throw new Error(`Gat ekki sótt mál með ID: ${id}.`)
  if (!res.data) throw new Error(`Ekkert mál fannst með ID: ${id}.`)
  return res.data
}

/* ---------- GraphQL docs (safe minimal selection) ---------- */

const GET_CASE_META = `
query CaseMeta($input: ConsultationPortalCaseInput!) {
  consultationPortalCaseById(input: $input) {
    id
  }
}
`

const GET_CASE_ADVICES_MINIMAL = `
query CaseAdvices($input: ConsultationPortalCaseInput!) {
  consultationPortalAdviceByCaseId(input: $input) {
    id
    participantName
    content
    created
  }
}
`

/* ---------- tiny GQL helper ---------- */

type GraphQLError = { message?: string; extensions?: { code?: string } }
type GraphQLResp<T> = { data?: T; errors?: GraphQLError[] }

async function postGraphQL<T>(query: string, variables: Record<string, unknown>, operationName: string) {
  const endpoint = 'https://island.is/api/graphql'
  return apiClient.post<GraphQLResp<T>>(endpoint, { query, variables, operationName })
}

/* ---------- public API ---------- */

export const fetchCaseComments = async (id: string): Promise<CaseComment[]> => {
  const caseId = Number.parseInt(id, 10)
  if (Number.isNaN(caseId)) throw new Error('A valid numeric case ID is required.')

  // Ensure case exists
  {
    const meta = await postGraphQL<{ consultationPortalCaseById?: { id?: number | null } | null }>(
      GET_CASE_META,
      { input: { caseId } },
      'CaseMeta',
    )
    if (!meta.success) throw new Error('Gat ekki sótt umsagnir fyrir mál.')
    const found = !!meta.data?.data?.consultationPortalCaseById?.id
    if (!found) return []
  }

  // Fetch advices with minimal, schema-safe selection
  const adv = await postGraphQL<{ consultationPortalAdviceByCaseId?: Array<{
    id: number
    participantName?: string
    content?: string | null
    created: string
  }> | null }>(
    GET_CASE_ADVICES_MINIMAL,
    { input: { caseId } },
    'CaseAdvices',
  )

  if (!adv.success) throw new Error('Gat ekki sótt umsagnir fyrir mál.')

  const items = adv.data?.data?.consultationPortalAdviceByCaseId ?? []
  if (!Array.isArray(items) || items.length === 0) return []

  return items.map((a) => ({
    id: a.id,
    caseId,
    contact: a.participantName ?? '',
    comment: a.content || 'Engin athugasemd fylgdi.',
    created: a.created,
    attachments: [], // schema has no files/adviceFiles; keep empty
  }))
}

