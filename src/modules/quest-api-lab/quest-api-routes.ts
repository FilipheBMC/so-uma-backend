
import type { FastifyPluginAsync } from 'fastify'

import {
  getLabSubjects,
  getLabTopics,
} from './quest-api-lab.service.js'

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

  // Listar matérias
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

  // Listar assuntos de uma matéria
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
}

export default questApiLabRoutes
