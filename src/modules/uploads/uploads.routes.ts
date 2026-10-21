
import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { resolve } from "node:path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const uploadDirectory = resolve(
  process.cwd(),
  "storage",
  "uploads",
  "pdfs",
);

function isFileTooLarge(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "FST_REQ_FILE_TOO_LARGE"
  );
}

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post("/pdf", async (request, reply) => {
    const file = await request.file({
      limits: {
        files: 1,
        fileSize: MAX_FILE_SIZE,
      },
    });

    if (!file) {
      return reply.code(400).send({
        message: "Envie um arquivo PDF no campo 'file'.",
      });
    }

    let buffer: Buffer;

    try {
      buffer = await file.toBuffer();
    } catch (error) {
      if (isFileTooLarge(error)) {
        return reply.code(413).send({
          message: "O arquivo excede o limite de 10 MB.",
        });
      }

      throw error;
    }

    const hasPdfExtension =
      extname(file.filename).toLowerCase() === ".pdf";

    const hasPdfSignature =
      buffer.subarray(0, 5).toString("ascii") === "%PDF-";

    if (!hasPdfExtension || !hasPdfSignature) {
      return reply.code(415).send({
        message: "O arquivo enviado não parece ser um PDF válido.",
      });
    }

    const id = randomUUID();
    const storageKey = `${id}.pdf`;
    const destination = resolve(uploadDirectory, storageKey);

    await mkdir(uploadDirectory, { recursive: true });

    await writeFile(destination, buffer, { flag: "wx" });

    return reply.code(201).send({
      id,
      originalFilename: file.filename,
      storageKey,
      sizeBytes: buffer.length,
      message: "PDF recebido e salvo no servidor.",
    });
  });
};
