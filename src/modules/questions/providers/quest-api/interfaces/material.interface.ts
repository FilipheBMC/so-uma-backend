export type Materia = string;

export interface MaterialApiResponse {
	data: {
		items: Materia[];
	};
	meta : {
		correlationalId: string;
		timestamp: string;
	};

}
