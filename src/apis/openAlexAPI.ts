import { requestUrl } from 'obsidian'
import { OPENALEX_API_URL } from 'src/constants'
import { sanitizeDOI } from 'src/utils/parser'
import { mapOpenAlexWork } from './openAlexMapper'
import { Reference } from './s2agTypes'
import { OpenAlexResponse, OpenAlexWork } from './openAlexTypes'

const OPENALEX_FIELDS = [
	'id',
	'doi',
	'ids',
	'title',
	'display_name',
	'abstract_inverted_index',
	'authorships',
	'publication_year',
	'publication_date',
	'primary_location',
	'best_oa_location',
	'open_access',
	'referenced_works_count',
	'cited_by_count',
	'biblio',
	'type',
	'primary_topic',
]

export class OpenAlexApiError extends Error {
	constructor(message: string, public status?: number) {
		super(message)
		this.name = 'OpenAlexApiError'
	}
}

const errorForStatus = (status: number): OpenAlexApiError => {
	if (status === 401 || status === 403) {
		return new OpenAlexApiError(
			'OpenAlex rejected the API key. Check the key in Literature Flow settings.',
			status
		)
	}
	if (status === 429) {
		return new OpenAlexApiError(
			'OpenAlex rate limit reached. Add a free API key in Literature Flow settings or try again after the quota resets.',
			status
		)
	}
	return new OpenAlexApiError(`OpenAlex request failed with status ${status}.`, status)
}

const getRequestStatus = (error: unknown): number | undefined => {
	if (typeof error !== 'object' || error === null || !('status' in error)) return undefined
	const status = (error as { status?: unknown }).status
	return typeof status === 'number' ? status : undefined
}

const requestOpenAlex = async <T>(url: string): Promise<T> => {
	try {
		const response = await requestUrl(url)
		if (response.status < 200 || response.status >= 300) {
			throw errorForStatus(response.status)
		}
		return response.json as T
	} catch (error) {
		if (error instanceof OpenAlexApiError) throw error
		const status = getRequestStatus(error)
		if (status) throw errorForStatus(status)
		throw new OpenAlexApiError(
			`Could not reach OpenAlex. ${error instanceof Error ? error.message : 'Check your internet connection.'}`
		)
	}
}

const makeParams = (apiKey: string): URLSearchParams => {
	const params = new URLSearchParams()
	const trimmedKey = apiKey.trim()
	if (trimmedKey) params.set('api_key', trimmedKey)
	params.set('select', OPENALEX_FIELDS.join(','))
	return params
}

export const getOpenAlexSearchItems = async (
	query: string,
	limit: number,
	apiKey: string
): Promise<Reference[]> => {
	const params = makeParams(apiKey)
	params.set('search', query)
	params.set('filter', 'is_oa:true')
	params.set('per-page', Math.min(Math.max(limit, 1), 100).toString())

	const response = await requestOpenAlex<OpenAlexResponse>(
		`${OPENALEX_API_URL}/works?${params.toString()}`
	)
	return response.results.map(mapOpenAlexWork)
}

export const getOpenAlexWorkByDoi = async (
	dirtyDoi: string,
	apiKey: string
): Promise<Reference | null> => {
	const doi = sanitizeDOI(dirtyDoi)
	const params = makeParams(apiKey)
	const identifier = encodeURIComponent(`https://doi.org/${doi}`)
	let work: OpenAlexWork
	try {
		work = await requestOpenAlex<OpenAlexWork>(
			`${OPENALEX_API_URL}/works/${identifier}?${params.toString()}`
		)
	} catch (error) {
		if (error instanceof OpenAlexApiError && error.status === 404) return null
		throw error
	}
	if (!work.open_access?.is_oa) return null
	return mapOpenAlexWork(work)
}
