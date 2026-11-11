import { questionService } from "../questions/questions.service.js";
import type { StudyOrchestratorInput } from "./study-preparation.types.js";
import { organizer } from "./study.organaizer.js";

export async function studyOrchestror(input: StudyOrchestratorInput) {
    const dataOrganized = organizer(input);
    const questions = await questionService(dataOrganized);
    // Criar um verificador de respostas anteriores.
    return {
        ...dataOrganized,
        questions: questions.results,
        notifications: questions.notifications,
    };

}