
import type { FastifyPluginAsync } from 'fastify'

import {
  getLabSubjects,
  getLabTopics,
} from './quest-api-lab.service.js'

// Estrutura recebida do frontend
interface ManualStudySelectionBody {
  source: 'manual'
  subjects: {
    name: string
    topics: string[]
  }[]
}

// Validação dos parâmetros de paginação
function parsePagination(
  pageValue?: string,
  perPageValue?: string,
) {
  const page = Number(pageValue ?? 1)
  const perPage = Number(perPageValue ?? 20)

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(perPage) ||
    perPage < 1 ||
    perPage > 100
  ) {
    return null
  }

  return { page, perPage }
}

const questApiLabRoutes: FastifyPluginAsync = async (app) => {

  // ==========================================
  // 1. Listar matérias
  // ==========================================
  app.get<{
    Querystring: {
      page?: string
      per_page?: string
    }
  }>('/subjects', async (request, reply) => {

    const pagination = parsePagination(
      request.query.page,
      request.query.per_page,
    )

    if (!pagination) {
      return reply.status(400).send({
        message: 'Parâmetros de paginação inválidos.',
      })
    }

    try {
      const result = await getLabSubjects(pagination)

      return reply.send(result)
    } catch (error) {
      request.log.error(error)

      return reply.status(502).send({
        message: 'Erro ao consultar matérias na Quest API.',
      })
    }
  })

  // ==========================================
  // 2. Listar assuntos de uma matéria
  // ==========================================
  app.get<{
    Querystring: {
      materia?: string
      page?: string
      per_page?: string
    }
  }>('/topics', async (request, reply) => {

    const materia = request.query.materia?.trim()

    if (!materia) {
      return reply.status(400).send({
        message: 'Informe a matéria desejada.',
      })
    }

    const pagination = parsePagination(
      request.query.page,
      request.query.per_page,
    )

    if (!pagination) {
      return reply.status(400).send({
        message: 'Parâmetros de paginação inválidos.',
      })
    }

    try {
      const result = await getLabTopics({
        materia,
        ...pagination,
      })

      return reply.send(result)
    } catch (error) {
      request.log.error(error)

      return reply.status(502).send({
        message: 'Erro ao consultar assuntos na Quest API.',
      })
    }
  })

  // ==========================================
  // 3. Receber seleção manual do frontend
  // ==========================================
  app.post<{
    Body: ManualStudySelectionBody
  }>(
    '/selection',
    {
      schema: {
        body: {
          type: 'object',
          required: ['source', 'subjects'],
          additionalProperties: false,
          properties: {
            source: {
              type: 'string',
              enum: ['manual'],
            },
            subjects: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['name', 'topics'],
                additionalProperties: false,
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                  },
                  topics: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'string',
                      minLength: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { subjects } = request.body

      // Verifica se existem nomes e assuntos preenchidos
      const hasEmptyValues = subjects.some(
        (subject) =>
          !subject.name.trim() ||
          subject.topics.some((topic) => !topic.trim()),
      )

      if (hasEmptyValues) {
        return reply.status(400).send({
          message: 'Informe matérias e assuntos válidos.',
        })
      }

      // Normaliza os dados recebidos
      const normalizedSubjects = subjects.map((subject) => ({
        name: subject.name.trim(),
        topics: subject.topics.map((topic) => topic.trim()),
      }))

      request.log.info(
        {
          source: 'manual',
          subjects: normalizedSubjects,
        },
        'Seleção manual recebida.',
      )

      return reply.status(200).send({
        message: 'Seleção manual recebida com sucesso.',
        data: {
          source: 'manual',
          subjects: normalizedSubjects,
        },
      })
    },
  )
}

export default questApiLabRoutes
