
import type {
  QuestApiLabPagination,
  QuestApiLabResponse,
  QuestApiLabTopicsQuery,
} from './quest-api-lab.types.js'

const QUEST_API_URL = "https://api.quest.api.br/v2"
const QUEST_API_KEY = process.env.QUEST_API_KEY

interface QuestApiRawResponse {
  data: {
    items: string[]
    page?: number
    per_page?: number
    has_more: boolean
    total?: number
  }
}

interface QuestApiRequestOptions extends QuestApiLabPagination {
  materia?: string
}

async function requestQuestApi(
  endpoint: string,
  options: QuestApiRequestOptions,
): Promise<QuestApiLabResponse> {
  if (!QUEST_API_URL) {
    throw new Error('QUEST_API_URL não configurada.')
  }

  if (!QUEST_API_KEY) {
    throw new Error('QUEST_API_KEY não configurada.')
  }

  const baseUrl = QUEST_API_URL.replace(/\/+$/, '')
  const url = new URL(`${baseUrl}${endpoint}`)

  url.searchParams.set('page', String(options.page))
  url.searchParams.set('per_page', String(options.perPage))

  if (options.materia) {
    url.searchParams.set('materia', options.materia)
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-API-Key': QUEST_API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Quest API retornou HTTP ${response.status}.`,
    )
  }

  const result = await response.json() as QuestApiRawResponse

  if (
    !result.data ||
    !Array.isArray(result.data.items) ||
    typeof result.data.has_more !== 'boolean'
  ) {
    throw new Error('Resposta inesperada da Quest API.')
  }

  return {
    items: result.data.items,
    page: result.data.page ?? options.page,
    perPage: result.data.per_page ?? options.perPage,
    hasMore: result.data.has_more,
    ...(result.data.total !== undefined && {
      total: result.data.total,
    }),
  }
}

export async function getLabSubjects(
  query: QuestApiLabPagination,
): Promise<QuestApiLabResponse> {
  return requestQuestApi('/filtros/materias', query)
}

export async function getLabTopics(
  query: QuestApiLabTopicsQuery,
): Promise<QuestApiLabResponse> {
  return requestQuestApi('/filtros/assuntos', query)
}
