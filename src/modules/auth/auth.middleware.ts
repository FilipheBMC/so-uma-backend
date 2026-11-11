import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({
      error: "Não autenticado.",
      message: "Token ausente, inválido ou expirado.",
    });
  }
}