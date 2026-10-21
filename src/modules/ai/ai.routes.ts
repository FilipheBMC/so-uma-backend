// Para que serve os outros tipos de plugins ?
// src/modules/ai/ai.types.ts

// src/modules/ai/ai.types.ts

// src/modules/ai/ai.routes.ts

import type { FastifyPluginAsync } from "fastify";
import { analyzePdf } from "./ai.service.js";
import type { AIUpload } from "./ai.types.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.get("/ai-test", async (_request, reply) => {
  return reply
    .type("text/html; charset=utf-8")
    .send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Teste de análise de PDF com IA</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 700px;
            margin: 40px auto;
            padding: 20px;
            background: #f4f4f5;
            color: #18181b;
          }

          main {
            background: white;
            padding: 28px;
            border-radius: 12px;
          }

          label {
            display: block;
            margin-top: 20px;
            margin-bottom: 8px;
            font-weight: bold;
          }

          input, textarea, button {
            box-sizing: border-box;
            width: 100%;
            padding: 12px;
            font: inherit;
          }

          button {
            margin-top: 20px;
            background: #18181b;
            color: white;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
          }

          button:disabled {
            opacity: 0.6;
            cursor: wait;
          }

          pre {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }

          #status {
            margin-top: 20px;
          }
        </style>
      </head>

      <body>
        <main>
          <h1>Análise de PDF com IA</h1>
          <p>Envie um documento e, opcionalmente, diga o que a IA deve analisar.</p>

          <form id="pdfForm">
            <label for="pdf">Arquivo PDF *</label>
            <input
              id="pdf"
              name="pdf"
              type="file"
              accept=".pdf,application/pdf"
              required
            />

            <label for="input">Instruções para a IA (opcional)</label>
            <textarea
              id="input"
              name="input"
              rows="5"
              placeholder="Ex.: Analise o edital e liste todas as disciplinas cobradas."
            ></textarea>

            <button id="submitButton" type="submit">
              Enviar PDF para análise
            </button>
          </form>

          <section id="status" aria-live="polite"></section>
          <pre id="result"></pre>
        </main>

        <script>
          const form = document.getElementById("pdfForm");
          const status = document.getElementById("status");
          const result = document.getElementById("result");
          const button = document.getElementById("submitButton");

          form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const file = document.getElementById("pdf").files[0];
            const input = document.getElementById("input").value.trim();

            if (!file) {
              status.textContent = "Selecione um PDF.";
              return;
            }

            const formData = new FormData();
            formData.append("pdf", file);

            if (input) {
              formData.append("input", input);
            }

            button.disabled = true;
            status.textContent = "Enviando PDF e aguardando a IA...";
            result.textContent = "";

            try {
              const response = await fetch("/analyze-pdf", {
                method: "POST",
                body: formData
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.message || "Não foi possível analisar o PDF."
                );
              }

              status.textContent = "Análise concluída!";
              result.textContent = data.result;
            } catch (error) {
              status.textContent = "Erro: " + error.message;
            } finally {
              button.disabled = false;
            }
          });
        </script>
      </body>
      </html>
    `);
});

    app.post("/analyze-pdf", async (request, reply) => {
    let pdfBuffer: Buffer | undefined;
    let input: AIUpload["input"];
    let filename = "";

    try {
      for await (const part of request.parts({
        limits: {
          files: 1,
          fields: 5,
          fileSize: MAX_FILE_SIZE,
        },
      })) {
        if (part.type === "file") {
          if (part.fieldname !== "pdf") {
            part.file.resume();

            return reply.code(400).send({
              message: "Envie o arquivo no campo 'pdf'.",
            });
          }

          filename = part.filename;
          pdfBuffer = await part.toBuffer();
        } else if (part.fieldname === "input") {
          if (typeof part.value !== "string") {
            return reply.code(400).send({
              message: "O campo 'input' deve ser um texto.",
            });
          }

          input = part.value.trim() || undefined;
        }
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "FST_REQ_FILE_TOO_LARGE"
      ) {
        return reply.code(413).send({
          message: "O PDF excede o limite de 10 MB.",
        });
      }

      throw error;
    }

    if (!pdfBuffer) {
      return reply.code(400).send({
        message: "Envie um PDF no campo 'pdf'.",
      });
    }

    const hasPdfExtension = filename
      .toLowerCase()
      .endsWith(".pdf");

    const hasPdfSignature =
      pdfBuffer.subarray(0, 5).toString("ascii") === "%PDF-";

    if (!hasPdfExtension || !hasPdfSignature) {
      return reply.code(415).send({
        message: "O arquivo enviado não parece ser um PDF válido.",
      });
    }

    // Só está ocorrendo erro de tipo agora, tenho de arrumar depois.
    const result = await analyzePdf({
      pdfBuffer,
      input,
    });

    return reply.code(200).send({
      filename,
      result,
    });
  });
};