export type Assunto = string;

export interface AssuntosApiResponse {
    page: number;
    per_page: number;
    items: Assunto[];
    has_more: boolean;
}
