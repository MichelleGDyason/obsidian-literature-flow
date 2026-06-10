import { requestUrl } from 'obsidian'
import { SEMANTIC_FIELDS, SEMANTIC_SCHOLAR_API_URL } from 'src/constants'
import { Reference } from './s2agTypes';

export const SEMANTIC_SCHOLAR_BATCH_URL = 'https://api.semanticscholar.org/graph/v1/paper/batch'

const fromSemanticScholar = (paper: Reference | null): Reference | null =>
	paper ? { ...paper, dataProvider: 'semantic-scholar' } : null

const fromSemanticScholarList = (papers: Reference[]): Reference[] =>
	papers
		.filter((paper): paper is Reference => Boolean(paper))
		.map((paper) => ({ ...paper, dataProvider: 'semantic-scholar' }))

// Get details for multiple papers at once
export const getBatchItems = async (paperIds: string[]): Promise<Reference[]> => {
	const data = {
		ids: paperIds,
		fields: SEMANTIC_FIELDS.join(','),
	};

	const response = await requestUrl({
		url: SEMANTIC_SCHOLAR_BATCH_URL,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});
	if (response.status !== 200) {
		return [];
	}
	return fromSemanticScholarList((response.json as { data: Reference[] }).data);
}


export const getIndexItem = async (paperId: string): Promise<Reference | null> => {
	const url = `${SEMANTIC_SCHOLAR_API_URL}/paper/${paperId}?fields=${SEMANTIC_FIELDS.join(',')}`;
	const response = await requestUrl(url);
	if (response.status !== 200) {
		return null;
	}
	return fromSemanticScholar(response.json as Reference);
};

export const getReferenceItems = async (paperId: string, limit = 100): Promise<Reference[]> => {
	const url = `${SEMANTIC_SCHOLAR_API_URL}/paper/${paperId}/references?limit=${limit}&fields=${SEMANTIC_FIELDS.join(',')}`;
	const response = await requestUrl(url);
	if (response.status !== 200) {
		return [];
	}
	return fromSemanticScholarList(
		(response.json as { data: Array<{ citedPaper: Reference }> }).data.map(
			(item) => item.citedPaper
		)
	);
};

export const getCitationItems = async (paperId: string, limit = 100): Promise<Reference[]> => {
	const url = `${SEMANTIC_SCHOLAR_API_URL}/paper/${paperId}/citations?limit=${limit}&fields=${SEMANTIC_FIELDS.join(',')}`;
	const response = await requestUrl(url);
	if (response.status !== 200) {
		return [];
	}
	return fromSemanticScholarList(
		(response.json as { data: Array<{ citingPaper: Reference }> }).data.map(
			(item) => item.citingPaper
		)
	);
};

export const getSearchItems = async (
	query: string,
	limit: number
): Promise<Reference[]> => {
	const params = new URLSearchParams({
		query,
		fields: SEMANTIC_FIELDS.join(','),
		offset: '0',
		limit: limit.toString(),
	})
	const url = `${SEMANTIC_SCHOLAR_API_URL}/paper/search?${params.toString()}`;
	const response = await requestUrl(url);
	if (response.status !== 200) {
		return [];
	}
	return fromSemanticScholarList((response.json as { data: Reference[] }).data);
};
