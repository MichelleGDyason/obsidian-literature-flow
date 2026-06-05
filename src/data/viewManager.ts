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
	getOpenAlexSearchItems,
	getOpenAlexWorkByDoi,
} from 'src/apis/openAlexAPI'

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
		const cacheKey = `${query}${limit}`
		const cachedSearch = this.openAccessSearchCache.get(cacheKey)
		if (cachedSearch) {
			return cachedSearch
		}

		const papers = await getOpenAlexSearchItems(
			query,
			limit,
			this.plugin.settings.openAlexApiKey
		)
		if (cache) {
			this.openAccessSearchCache.set(cacheKey, papers)
		}
		return papers
	}

	getOpenAccessPaperByDoi = async (doi: string): Promise<Reference | null> =>
		getOpenAlexWorkByDoi(doi, this.plugin.settings.openAlexApiKey)

	getBatchPapers = async (paperIds: string[]): Promise<Reference[]> => {
		const cachedBatch = this.batchCache.get(paperIds.join(','))
		if (cachedBatch) {
			return cachedBatch
		}

		try {
			const batchPapers = await getBatchItems(paperIds)
			this.batchCache.set(paperIds.join(','), batchPapers)
			return batchPapers
		} catch {
			return []
		}
	}

	getIndexPaper = async (paperId: string, cacheError = true): Promise<Reference | null | undefined> => {

		if (this.indexCache.has(paperId)) {
			return this.indexCache.get(paperId)
		}

		try {
			const paper = await getIndexItem(paperId)
			this.indexCache.set(paperId, paper)
			return paper
		} catch {
			if (cacheError) this.indexCache.set(paperId, null)
			return null
		}
	}

	searchIndexPapers = async (query: string, limit = 0, cache = true): Promise<Reference[]> => {
		const cacheKey = `${query}${limit}`
		const cachedSearch = this.searchCache.get(cacheKey)
		if (cachedSearch) {
			return cachedSearch
		}

		try {
			const indexCardsList = await getSearchItems(query, limit)
			if (cache) {
				this.searchCache.set(cacheKey, indexCardsList)
			}
			return indexCardsList
		} catch {
			return []
		}
	}

	getReferences = async (paperId: string): Promise<Reference[]> => {
		if (this.refCache.has(paperId)) {
			return this.refCache.get(paperId) ?? []
		}

		try {
			const references = await getReferenceItems(paperId, this.plugin.settings.citedLimit)
			this.refCache.set(paperId, references)
			return references
		} catch {
			return []
		}
	}

	getCitations = async (paperId: string): Promise<Reference[]> => {
		if (this.citeCache.has(paperId)) {
			return this.citeCache.get(paperId) ?? []
		}
		try {
			const citations = await getCitationItems(paperId, this.plugin.settings.citingLimit)
			this.citeCache.set(paperId, citations)
			return citations
		} catch {
			return []
		}
	}
}
