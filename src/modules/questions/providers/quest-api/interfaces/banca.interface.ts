export type Banca = string;

export interface BancasApiResponse {
    data: {
        page: number;
        per_page: number;
        items: Banca[];
        has_more: boolean;
        total: number;
    };

    meta: {
        correlationId: string;
        timestamp: string;
    };
}