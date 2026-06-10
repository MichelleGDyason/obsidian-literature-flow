import { Reference } from 'src/apis/s2agTypes'
import { OPENALEX_API_URL, SEMANTIC_SCHOLAR_URL } from 'src/constants'
import { ReferenceMapSettings } from 'src/types'

const cleanDoi = (doi: string | undefined): string | undefined =>
	doi
		?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
		.trim()

export const hasOpenAccessLocation = (paper: Reference): boolean =>
	paper.isOpenAccess === true && Boolean(paper.openAccessPdf?.url)

export const filterByAccess = (
	papers: Reference[],
	openAccessOnly: boolean
): Reference[] =>
	openAccessOnly
		? papers.filter(hasOpenAccessLocation)
		: papers

const referenceKey = (paper: Reference): string => {
	const doi = cleanDoi(paper.externalIds?.DOI)?.toLowerCase()
	if (doi) return `doi:${doi}`

	const title = paper.title?.toLowerCase().replace(/\W+/g, ' ').trim()
	if (title) return `title:${title}:${paper.year ?? ''}`

	return `id:${paper.paperId}`
}

export const mergeReferences = (...groups: Reference[][]): Reference[] => {
	const merged = new Map<string, Reference>()
	const length = Math.max(0, ...groups.map((group) => group.length))
	for (let index = 0; index < length; index++) {
		for (const group of groups) {
			const paper = group[index]
			if (!paper) continue

			const key = referenceKey(paper)
			const existing = merged.get(key)
			if (!existing || paper.dataProvider === 'openalex') {
				merged.set(key, paper)
			}
		}
	}
	return Array.from(merged.values())
}

const providerPage = (paper: Reference): string | undefined => {
	if (paper.dataProvider === 'openalex' || paper.paperId.startsWith('OpenAlex:')) {
		const id = paper.paperId.replace(/^OpenAlex:/, '')
		return `${OPENALEX_API_URL.replace('api.', '')}/${id}`
	}
	if (paper.paperId) return `${SEMANTIC_SCHOLAR_URL}/paper/${paper.paperId}`
	return undefined
}

const institutionalUrl = (
	paper: Reference,
	template: string
): string | undefined => {
	const doi = cleanDoi(paper.externalIds?.DOI)
	const destination = doi
		? `https://doi.org/${doi}`
		: paper.url ?? providerPage(paper)
	if (!destination) return undefined

	if (!template.trim()) return destination

	return template
		.replaceAll('{{doi}}', encodeURIComponent(doi ?? ''))
		.replaceAll('{{url}}', encodeURIComponent(destination))
}

export const getPaperUrl = (
	paper: Reference,
	settings: Pick<
		ReferenceMapSettings,
		'openAccessOnly' | 'institutionalAccessUrlTemplate'
	>
): string | undefined => {
	if (hasOpenAccessLocation(paper)) {
		return paper.openAccessPdf?.url
	}

	if (paper.isOpenAccess && paper.url) {
		return paper.url
	}

	if (!settings.openAccessOnly) {
		return institutionalUrl(paper, settings.institutionalAccessUrlTemplate)
	}

	return undefined
}

export const getAuthorUrl = (
	paper: Reference,
	authorId: string | undefined
): string | undefined => {
	if (!authorId) return undefined
	if (paper.dataProvider === 'openalex') {
		return `https://openalex.org/${authorId}`
	}
	return `${SEMANTIC_SCHOLAR_URL}/author/${authorId}`
}
