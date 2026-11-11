// import { GoogleGenAI } from "@google/genai";

// const apiKey = process.env.GEMINI_API_KEY;

// if (!apiKey) {
//   throw new Error("GEMINI_API_KEY não foi configurada no .env");
// }

// const ai = new GoogleGenAI({
//   apiKey,
// });

// const interaction = await ai.interactions.create({
//   model: "gemini-3.8-flash",
//   input: "Explain how AI works in a few words",
// });
// console.log(interaction.output_text);

// src/modules/ai/ai.service.ts

import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "./ai.types.js";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY não configurada.");
}

const ai = new GoogleGenAI({ apiKey });

const model = process.env.GEMINI_MODEL;

if (!model) {
  throw new Error("GEMINI_MODEL não configurado.");
}

type AnalyzePdfParams = {
  pdfBuffer: Buffer;
  input?: string;
};

// Melhorar o Default input
const DEFAULT_INPUT = `
Analise o documento PDF fornecido.
Identifique o assunto principal, os tópicos mais importantes,
a estrutura do documento e informações relevantes.
Organize a resposta em português, com títulos e listas quando apropriado.
Não invente informações que não estejam sustentadas pelo documento.
`;

export const INPUT = `1. LÍNGUA PORTUGUESA
Compreensão e interpretação de textos de gêneros variados. Reconhecimento de tipos e gêneros
textuais. Domínio da ortografia oficial. Emprego das letras. Emprego da acentuação gráfica.
Domínio dos mecanismos de coesão textual. Emprego de elementos de referenciação, substituição
e repetição, de conectores e outros elementos de sequenciação textual. Emprego/correlação de
tempos e modos verbais. Domínio da estrutura morfossintática do período. Emprego das classes
de palavras. Relações de coordenação entre orações e entre termos da oração. Relações de
subordinação entre orações e entre termos da oração. Emprego dos sinais de pontuação.
Concordância verbal e nominal. Emprego do sinal indicativo de crase. Colocação dos pronomes
átonos. Reescrita de textos de diferentes gêneros e níveis de formalidade. Correspondência oficial
(conforme Manual de Redação da Presidência da República). Adequação da linguagem ao tipo de
documento. Adequação do formato do texto ao gênero.
2. NOÇÕES DE DIREITO:
DIREITO CONSTITUCIONAL
Princípios fundamentais da Constituição da República (Arts. 1º ao 4º da CF/88). Direitos e
Garantias Fundamentais: Direitos e Deveres Individuais e Coletivos; Direitos Sociais;
Nacionalidade; Direitos Políticos (Arts. 5° a 16 da CF/88). Da Organização Político-Administrativa
(Arts. 18 e 19 da CF/88). Da União (Arts. 20 a 24 da CF/88). Dos Estados Federados (Arts. 25 a 28
da CF/88). Dos Municípios (Arts. 29 a 31 da CF/88). Normas Constitucionais relativas à
Administração Pública e ao Servidor Público (Arts. 37 a 41 da CF/88). Princípios Constitucionais
da Administração Pública (art. 37 da Constituição Federal). Princípios constitucionais de natureza
ética: moralidade, impessoalidade, probidade, motivação e publicidade (Art. 37 da Constituição
Federal; Art. 77 da Constituição do Estado do Rio de Janeiro). Organização dos Poderes (Arts. 44 a
135 da CF/88). Da Segurança Pública (Art. 144).
DIREITO PENAL
Página 49 de 58ESTADO DO RIO DE JANEIRO
MUNICÍPIO DE SÃO GONÇALO-RJ
Princípios básicos do Direito Penal. Aplicação da lei penal. Lei penal no tempo e no espaço. Tempo
e lugar do crime. Territorialidade e extraterritorialidade. Conflito aparente de normas penais.
Fato típico, ilicitude e culpabilidade. Consumação e tentativa. Concurso de pessoas. Concurso de
crimes. Crimes contra a pessoa. Crimes contra o patrimônio. Crimes contra a dignidade sexual.
Crimes contra a fé pública. Crimes contra a Administração Pública. Crimes contra a Administração
da Justiça. Crimes hediondos (Lei n.º 8.072/1990). Abuso de Autoridade (Lei n.º 13.869/2019).
Crime de Tortura (Lei n.º 9.455/1997). Crimes previstos no Estatuto da Criança e do Adolescente
(Lei n.º 8.069/1990). Estatuto do Desarmamento (Lei n.º 10.826/2003). Crimes Ambientais (Lei
n.º 9.605/1998). Lei Maria da Penha (Lei n.º 11.340/2006). Lei de Drogas (Lei n.º 11.343/2006).
Lavagem de Dinheiro (Lei n.º 9.613/1998 e alterações posteriores). Disposições constitucionais
aplicáveis ao Direito Penal.
DIREITO PROCESSUAL PENAL
Código de Processo Penal: disposições preliminares. Inquérito Policial. Notícia do crime. Formas
de instauração. Investigação criminal. Indiciamento. Direitos e garantias do investigado. Prisão
em flagrante, prisão preventiva, prisão temporária e liberdade provisória. Garantias
constitucionais aplicáveis ao Direito Processual Penal. Lei n.º 9.099/1995 e suas alterações
(Juizados Especiais Criminais).
DIREITO ADMINISTRATIVO
Atos Administrativos: conceito, elementos, atributos, classificação, espécies, formação, efeitos,
extinção, anulação e revogação. Poderes da Administração Pública. Poder Hierárquico, Poder
Disciplinar e Poder Regulamentar. Uso e abuso de poder. Poder de Polícia: conceito,
competências, fundamentos, limites, características e sanções. Responsabilidade civil,
administrativa e penal dos agentes públicos. Responsabilidade civil do Estado. Agentes Públicos.
Servidores Públicos. Regime Jurídico dos Servidores Públicos. Direitos, deveres e
responsabilidades. Concurso público. Provimento, acessibilidade, estabilidade, remuneração e
acumulação de cargos públicos. Processo Administrativo Disciplinar. Improbidade
Administrativa. Lei Federal n.º 8.429/1992 e alterações posteriores.
3. LEGISLAÇÃO EXTRAVAGANTE
Crimes Hediondos (Lei n.º 8.072/1990). Abuso de Autoridade (Lei n.º 13.869/2019). Lei de
Tortura (Lei n.º 9.455/1997). Dos Crimes no Estatuto da Criança e do Adolescente (Lei n.º
8.069/1990). Estatuto do Desarmamento (Lei n.º 10.826/2003). Crimes contra o Meio Ambiente
(Lei n.º 9.605/1998). Lei Maria da Penha (Lei n.º 11.340/2006). Lei de Drogas (Lei n.º
11.343/2006). Organizações Criminosas (Lei n.º 12.850/2013). Lei nº 9.503, de 23 de setembro
de 1997 ( Código de Trânsito Brasileiro - CTB).
Página 50 de 58ESTADO DO RIO DE JANEIRO
MUNICÍPIO DE SÃO GONÇALO-RJ
4. CONHECIMENTOS ESPECÍFICOS
Lei Federal n.º 13.675, de 11 de junho de 2018 (Institui o Sistema Único de Segurança Pública –
SUSP). Lei Federal n.° 13.022, de 08 de agosto de 2014, e alterações (Estatuto Geral Das Guardas
Municipais). Lei Municipal nº 1.416/2022 (Estatuto dos Servidores Públicos do Município de São
Gonçalo). Lei Municipal n.º 1.625, de 28 de maio de 2026 (Estatuto da Guarda Municipal de São
Gonçalo);
5. INFORMÁTICA
Conceitos sobre informática, hardware e software. Sistemas operacionais Windows
XP/Vista/7/8.1/10BR, Linux e software livre. Processador de texto (Word
2007/2010/2013/2016BR e LibreOffice 6.x.x ou superior Writer): conceitos e uso dos recursos.
Planilhas eletrônicas (Excel 2007/2010/2013/2016BR e LibreOffice 6.x.x ou superior Calc):
conceitos e uso dos recursos. Editor de Apresentações (PowerPoint 2007/2010/2013/2016BR e
LibreOffice 6.x.x ou superior Impress): conceitos e uso dos recursos. Redes de computadores:
conceitos, características, equipamentos, transmissão de sinal, topologias, conectores,
cabeamento, protocolos e redes sem fio. Conceitos, serviços e tecnologias na Internet e Intranet,
web 2.0 e web 3.0. Navegador Internet (Internet Explorer 11 BR, Google Chrome e Mozilla Firefox):
conceitos e uso dos recursos. Conceitos e Ferramentas de busca e pesquisa na Web. Conceitos
sobre tecnologias e ferramentas de colaboração, de correio eletrônico e webmail, de grupos de
discussão, de fóruns, de wikis e redes sociais. Segurança da Informação, de sistemas, de
equipamentos, em redes e na internet: conceitos, aplicativos, proteção, ameaças e
vulnerabilidades. Conceitos sobre cópias de segurança (backup), vírus e antivírus. Criptografia e
assinatura digital. Conceitos sobre tecnologias e ferramentas multimídia, de reprodução de áudio
e vídeo, formatos de arquivos, de imagens e figuras.

`;

export async function analyzePdf({
  pdfBuffer,
  input,
}: AnalyzePdfParams): Promise<string> {
  const prompt = input || DEFAULT_INPUT;
console.log({
  model: process.env.GEMINI_MODEL,
  pdfBytes: pdfBuffer.length,
  mimeType: "application/pdf",
  isBuffer: Buffer.isBuffer(pdfBuffer),
});
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: "application/pdf",
              // mimeType: "application/json",
              data: pdfBuffer.toString("base64"),
              // data: INPUT
            },
          },
        ],
      },
    ],
  });

  const result = response.text;

  if (!result) {
    throw new Error("A IA não retornou conteúdo.");
  }

  return result;
};

export async function analyzeText(input: string): Promise<string> {
  const prompt = `
    Analise o conteúdo programático de um edital de concurso público.

    Identifique as disciplinas e organize os tópicos correspondentes.

    Retorne exclusivamente um JSON válido neste formato:
    {
      "subjects": [
        {
          "name": "Língua Portuguesa",
          "topics": [
            "Compreensão e interpretação de textos",
            "Ortografia oficial"
          ]
        }
      ]
    }

    Não invente disciplinas nem tópicos que não estejam no texto.

    CONTEÚDO PROGRAMÁTICO:
    ${input}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  const result = response.text;

  if (!result) {
    throw new Error("A IA não retornou conteúdo.");
  }

  return result;
}


type AnalyzeTextWithOpenRouterParams = {
  text: string;
  prompt: string;
  outputFormat?: "json" | "text";
};

type OpenRouterResponse = {
  model?: string;
  choices?: {
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
  }[];
  error?: {
    message?: string;
  };
};

export async function analyzeTextWithOpenRouter({
  text,
  prompt,
  outputFormat = "json",
}: AnalyzeTextWithOpenRouterParams): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurada.");
  }

  if (!text.trim()) {
    throw new Error("O texto enviado para análise está vazio.");
  }

  if (!prompt.trim()) {
    throw new Error("O prompt da análise não foi informado.");
  }

  const model = process.env.OPENROUTER_MODEL ?? "openrouter/free";

  const requestBody = {
    model,
    messages: [
      {
        role: "system" as const,
        content: prompt,
      },
      {
        role: "user" as const,
        content: text,
      },
    ],
    temperature: 0.1,
    ...(outputFormat === "json"
      ? {
          response_format: {
            type: "json_object" as const,
          },
        }
      : {}),
  };

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120_000),
    },
  );

  const responseText = await response.text();

  let data: OpenRouterResponse;

  try {
    data = JSON.parse(responseText) as OpenRouterResponse;
  } catch {
    throw new Error(
      `O OpenRouter retornou uma resposta inválida. HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Erro OpenRouter (${response.status}): ${
        data.error?.message ?? "Falha na requisição."
      }`,
    );
  }

  const result = data.choices?.[0]?.message?.content;

  if (typeof result !== "string" || !result.trim()) {
    const refusal = data.choices?.[0]?.message?.refusal;

    throw new Error(
      refusal || "O OpenRouter não retornou conteúdo.",
    );
  }

  if (outputFormat === "json") {
    try {
      JSON.parse(result);
    } catch {
      throw new Error(
        "A IA respondeu, mas o conteúdo não é um JSON válido.",
      );
    }
  }

  return result;
};

// Real Code

// AI Services.


const AIServiceOrcherstrador = async (ai: AIProvider, data: undefined) => {
}