import { requestUrl } from 'obsidian'
import { OPENALEX_API_URL } from 'src/constants'
import { sanitizeDOI } from 'src/utils/parser'
import { filterByAccess } from 'src/utils/access'
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
	'referenced_works',
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

const openAlexId = (value: string): string | null => {
	const normalized = value.trim()
	const directMatch = normalized.match(/(?:OpenAlex:|openalex\.org\/)(W\d+)/i)
	if (directMatch) return directMatch[1].toUpperCase()

	if (/^W\d+$/i.test(normalized)) return normalized.toUpperCase()
	if (/^PMID:/i.test(normalized)) return normalized.toLowerCase()
	if (/^PMCID:/i.test(normalized)) return normalized.toLowerCase()
	if (/^MAG:/i.test(normalized)) return normalized.toLowerCase()

	const doi = sanitizeDOI(normalized)
	if (/^10\.\d{4,9}\//i.test(doi)) return `https://doi.org/${doi}`

	return null
}

const getRawOpenAlexWork = async (
	identifier: string,
	apiKey: string
): Promise<OpenAlexWork | null> => {
	const normalizedIdentifier = openAlexId(identifier)
	if (!normalizedIdentifier) return null

	const params = makeParams(apiKey)
	try {
		return await requestOpenAlex<OpenAlexWork>(
			`${OPENALEX_API_URL}/works/${encodeURIComponent(normalizedIdentifier)}?${params.toString()}`
		)
	} catch (error) {
		if (error instanceof OpenAlexApiError && error.status === 404) return null
		throw error
	}
}

const makeWorksListParams = (
	apiKey: string,
	filter: string,
	limit: number
): URLSearchParams => {
	const params = makeParams(apiKey)
	params.set('filter', filter)
	params.set('per-page', Math.min(Math.max(limit, 1), 100).toString())
	return params
}

const getOpenAlexWorks = async (
	filter: string,
	limit: number,
	apiKey: string
): Promise<Reference[]> => {
	const params = makeWorksListParams(apiKey, filter, limit)
	const response = await requestOpenAlex<OpenAlexResponse>(
		`${OPENALEX_API_URL}/works?${params.toString()}`
	)
	return response.results.map(mapOpenAlexWork)
}

const accessFilter = (openAccessOnly: boolean): string =>
	openAccessOnly ? ',is_oa:true' : ''

export const getOpenAlexSearchItems = async (
	query: string,
	limit: number,
	apiKey: string,
	openAccessOnly = true
): Promise<Reference[]> => {
	const params = makeParams(apiKey)
	params.set('search', query)
	if (openAccessOnly) params.set('filter', 'is_oa:true')
	params.set('per-page', Math.min(Math.max(limit, 1), 100).toString())

	const response = await requestOpenAlex<OpenAlexResponse>(
		`${OPENALEX_API_URL}/works?${params.toString()}`
	)
	return filterByAccess(response.results.map(mapOpenAlexWork), openAccessOnly)
}

export const getOpenAlexWorkByIdentifier = async (
	identifier: string,
	apiKey: string,
	openAccessOnly = true
): Promise<Reference | null> => {
	const work = await getRawOpenAlexWork(identifier, apiKey)
	if (!work) return null
	const paper = mapOpenAlexWork(work)
	return filterByAccess([paper], openAccessOnly)[0] ?? null
}

export const getOpenAlexWorkByDoi = (
	dirtyDoi: string,
	apiKey: string,
	openAccessOnly = true
): Promise<Reference | null> =>
	getOpenAlexWorkByIdentifier(
		`https://doi.org/${sanitizeDOI(dirtyDoi)}`,
		apiKey,
		openAccessOnly
	)

const getRootWork = async (
	paper: Reference,
	apiKey: string
): Promise<OpenAlexWork | null> => {
	const identifier = paper.paperId.startsWith('OpenAlex:')
		? paper.paperId
		: paper.externalIds?.DOI ?? paper.paperId
	return getRawOpenAlexWork(identifier, apiKey)
}

export const getOpenAlexReferenceItems = async (
	paper: Reference,
	limit: number,
	apiKey: string,
	openAccessOnly = true
): Promise<Reference[]> => {
	const root = await getRootWork(paper, apiKey)
	const ids = root?.referenced_works
		?.map((id) => openAlexId(id))
		.filter((id): id is string => Boolean(id)) ?? []
	if (!ids.length) return []

	const results: Reference[] = []
	for (let index = 0; index < ids.length && results.length < limit; index += 100) {
		const chunk = ids.slice(index, index + 100)
		const filter = `openalex:${chunk.join('|')}${accessFilter(openAccessOnly)}`
		const papers = await getOpenAlexWorks(filter, Math.min(chunk.length, 100), apiKey)
		results.push(...filterByAccess(papers, openAccessOnly))
	}
	return results.slice(0, limit)
}

export const getOpenAlexCitationItems = async (
	paper: Reference,
	limit: number,
	apiKey: string,
	openAccessOnly = true
): Promise<Reference[]> => {
	const root = await getRootWork(paper, apiKey)
	const id = root ? openAlexId(root.id) : null
	if (!id) return []

	return filterByAccess(
		await getOpenAlexWorks(
			`cites:${id}${accessFilter(openAccessOnly)}`,
			limit,
			apiKey
		),
		openAccessOnly
	)
}
