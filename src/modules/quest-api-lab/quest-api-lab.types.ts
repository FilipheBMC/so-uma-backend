
export interface QuestApiLabPagination {
  page: number
  perPage: number
}

export interface QuestApiLabTopicsQuery
  extends QuestApiLabPagination {
  materia: string
}

export interface QuestApiLabResponse {
  items: string[]
  page: number
  perPage: number
  hasMore: boolean
  total?: number
}
