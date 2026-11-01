import type { QuestionsProvider } from "../questions-provider.interface.js";
import { QuestApiProvider } from "./quest-api.provider.js";
const questApi = new QuestApiProvider();

const providers: Record<string, QuestionsProvider> = {
  [questApi.id]: questApi,
};

export function getQuestionsProvider(
  providerId = "quest-api",
): QuestionsProvider {
  const provider = providers[providerId];

  if (!provider) {
    throw new Error(`Provedor de questões desconhecido: ${providerId}`);
  }

  return provider;
}