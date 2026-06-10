import LRUCache from 'lru-cache'
import ReferenceMap from 'src/main'
import {
	getIndexItem,
	getReferenceItems,
	getCitationItems,
	getSearchItems,
	getBatchItems,
} from 'src/apis/s2agAPI'
import { Reference } from 'src/apis/s2agTypes'
import {
	getOpenAlexCitationItems,
	getOpenAlexReferenceItems,
	getOpenAlexSearchItems,
	getOpenAlexWorkByIdentifier,
} from 'src/apis/openAlexAPI'
import { filterByAccess, mergeReferences } from 'src/utils/access'
import { SEARCH_PROVIDER } from 'src/types'

const fallback = async <T>(promise: Promise<T>, value: T): Promise<T> => {
	try {
		return await promise
	} catch {
		return value
	}
}

export class ViewManager {
	private indexCache = new LRUCache<string, Reference | null | undefined>({ max: 150 })
	private refCache = new LRUCache<string, Reference[]>({ max: 150 })
	private citeCache = new LRUCache<string, Reference[]>({ max: 150 })
	private searchCache = new LRUCache<string, Reference[]>({ max: 20 })
	private openAccessSearchCache = new LRUCache<string, Reference[]>({ max: 20 })
	private batchCache = new LRUCache<string, Reference[]>({ max: 50 })

	constructor(private plugin: ReferenceMap) { }

	clearCache = () => {
		this.indexCache.clear()
		this.batchCache.clear()
		this.refCache.clear()
		this.citeCache.clear()
		this.searchCache.clear()
		this.openAccessSearchCache.clear()
	}

	searchOpenAccessPapers = async (query: string, limit = 0, cache = true): Promise<Reference[]> => {
		const cacheKey = `${query}:${limit}:${this.plugin.settings.openAccessOnly}`
		const cachedSearch = this.openAccessSearchCache.get(cacheKey)
		if (cachedSearch) {
			return cachedSearch
		}

		const papers = await getOpenAlexSearchItems(
			query,
			limit,
			this.plugin.settings.openAlexApiKey,
			this.plugin.settings.openAccessOnly
		)
		if (cache) {
			this.openAccessSearchCache.set(cacheKey, papers)
		}
		return papers
	}

	getOpenAlexPaper = async (identifier: string): Promise<Reference | null> =>
		getOpenAlexWorkByIdentifier(
			identifier,
			this.plugin.settings.openAlexApiKey,
			this.plugin.settings.openAccessOnly
		)

	private semanticPapers = (papers: Reference[]): Reference[] =>
		filterByAccess(papers, this.plugin.settings.openAccessOnly)

	private semanticPaperId = (paper: Reference): string =>
		paper.externalIds?.DOI ?? paper.paperId

	private cacheKey = (value: string): string =>
		[
			this.plugin.settings.modalSearchProvider,
			this.plugin.settings.openAccessOnly,
			value,
		].join(':')

	getBatchPapers = async (paperIds: string[]): Promise<Reference[]> => {
		const cacheKey = this.cacheKey(paperIds.join(','))
		const cachedBatch = this.batchCache.get(cacheKey)
		if (cachedBatch) {
			return cachedBatch
		}

		try {
			const batchPapers = this.semanticPapers(await getBatchItems(paperIds))
			this.batchCache.set(cacheKey, batchPapers)
			return batchPapers
		} catch {
			return []
		}
	}

	getIndexPaper = async (paperId: string, cacheError = true): Promise<Reference | null | undefined> => {
		const cacheKey = this.cacheKey(paperId)

		if (this.indexCache.has(cacheKey)) {
			return this.indexCache.get(cacheKey)
		}

		try {
			const provider = this.plugin.settings.modalSearchProvider
			let paper: Reference | null = null
			if (provider === SEARCH_PROVIDER.OPENALEX) {
				paper = await this.getOpenAlexPaper(paperId)
			} else if (provider === SEARCH_PROVIDER.SEMANTIC_SCHOLAR) {
				paper = this.semanticPapers(
					[await getIndexItem(paperId)].filter(
						(item): item is Reference => item !== null
					)
				)[0] ?? null
			} else {
				const [openAlexPaper, semanticPaper] = await Promise.all([
					fallback(this.getOpenAlexPaper(paperId), null),
					fallback(getIndexItem(paperId), null),
				])
				paper = openAlexPaper ?? this.semanticPapers(
					[semanticPaper].filter(
						(item): item is Reference => item !== null
					)
				)[0] ?? null
			}
			this.indexCache.set(cacheKey, paper)
			return paper
		} catch (error) {
			if (!cacheError) throw error
			if (cacheError) this.indexCache.set(cacheKey, null)
			return null
		}
	}

	searchIndexPapers = async (query: string, limit = 0, cache = true): Promise<Reference[]> => {
		const cacheKey = this.cacheKey(`${query}:${limit}`)
		const cachedSearch = this.searchCache.get(cacheKey)
		if (cachedSearch) {
			return cachedSearch
		}

		try {
			const provider = this.plugin.settings.modalSearchProvider
			let indexCardsList: Reference[]
			if (provider === SEARCH_PROVIDER.OPENALEX) {
				indexCardsList = await this.searchOpenAccessPapers(query, limit, cache)
			} else if (provider === SEARCH_PROVIDER.SEMANTIC_SCHOLAR) {
				indexCardsList = this.semanticPapers(await getSearchItems(query, limit))
			} else {
				const [openAlexPapers, semanticScholarPapers] = await Promise.all([
					fallback(this.searchOpenAccessPapers(query, limit, cache), []),
					fallback(getSearchItems(query, limit), []),
				])
				indexCardsList = mergeReferences(
					openAlexPapers,
					this.semanticPapers(semanticScholarPapers)
				).slice(0, limit)
			}
			if (cache) {
				this.searchCache.set(cacheKey, indexCardsList)
			}
			return indexCardsList
		} catch (error) {
			if (!cache) throw error
			return []
		}
	}

	getReferences = async (paper: Reference): Promise<Reference[]> => {
		const cacheKey = this.cacheKey(paper.paperId)
		if (this.refCache.has(cacheKey)) {
			return this.refCache.get(cacheKey) ?? []
		}

		try {
			const provider = this.plugin.settings.modalSearchProvider
			let references: Reference[]
			if (provider === SEARCH_PROVIDER.OPENALEX) {
				references = await getOpenAlexReferenceItems(
					paper,
					this.plugin.settings.citedLimit,
					this.plugin.settings.openAlexApiKey,
					this.plugin.settings.openAccessOnly
				)
			} else if (provider === SEARCH_PROVIDER.SEMANTIC_SCHOLAR) {
				references = this.semanticPapers(
					await getReferenceItems(
						this.semanticPaperId(paper),
						this.plugin.settings.citedLimit
					)
				)
			} else {
				const [openAlexPapers, semanticScholarPapers] = await Promise.all([
					fallback(getOpenAlexReferenceItems(
						paper,
						this.plugin.settings.citedLimit,
						this.plugin.settings.openAlexApiKey,
						this.plugin.settings.openAccessOnly
					), []),
					fallback(
						getReferenceItems(
							this.semanticPaperId(paper),
							this.plugin.settings.citedLimit
						),
						[]
					),
				])
				references = mergeReferences(
					openAlexPapers,
					this.semanticPapers(semanticScholarPapers)
				).slice(0, this.plugin.settings.citedLimit)
			}
			this.refCache.set(cacheKey, references)
			return references
		} catch {
			return []
		}
	}

	getCitations = async (paper: Reference): Promise<Reference[]> => {
		const cacheKey = this.cacheKey(paper.paperId)
		if (this.citeCache.has(cacheKey)) {
			return this.citeCache.get(cacheKey) ?? []
		}
		try {
			const provider = this.plugin.settings.modalSearchProvider
			let citations: Reference[]
			if (provider === SEARCH_PROVIDER.OPENALEX) {
				citations = await getOpenAlexCitationItems(
					paper,
					this.plugin.settings.citingLimit,
					this.plugin.settings.openAlexApiKey,
					this.plugin.settings.openAccessOnly
				)
			} else if (provider === SEARCH_PROVIDER.SEMANTIC_SCHOLAR) {
				citations = this.semanticPapers(
					await getCitationItems(
						this.semanticPaperId(paper),
						this.plugin.settings.citingLimit
					)
				)
			} else {
				const [openAlexPapers, semanticScholarPapers] = await Promise.all([
					fallback(getOpenAlexCitationItems(
						paper,
						this.plugin.settings.citingLimit,
						this.plugin.settings.openAlexApiKey,
						this.plugin.settings.openAccessOnly
					), []),
					fallback(
						getCitationItems(
							this.semanticPaperId(paper),
							this.plugin.settings.citingLimit
						),
						[]
					),
				])
				citations = mergeReferences(
					openAlexPapers,
					this.semanticPapers(semanticScholarPapers)
				).slice(0, this.plugin.settings.citingLimit)
			}
			this.citeCache.set(cacheKey, citations)
			return citations
		} catch {
			return []
		}
	}
}
