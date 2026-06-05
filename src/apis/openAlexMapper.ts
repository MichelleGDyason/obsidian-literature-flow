import { Reference } from './s2agTypes'
import { OpenAlexWork } from './openAlexTypes'

const stripPrefix = (value: string | null | undefined, prefix: string): string | undefined => {
	if (!value) return undefined
	return value.startsWith(prefix) ? value.slice(prefix.length) : value
}

const cleanBibtexValue = (value: string | null | undefined): string =>
	(value ?? '').replace(/[{}]/g, '').trim()

const makePages = (work: OpenAlexWork): string | undefined => {
	const first = work.biblio?.first_page ?? undefined
	const last = work.biblio?.last_page ?? undefined
	if (first && last && first !== last) return `${first}-${last}`
	return first ?? last
}

const makeBibtexKey = (work: OpenAlexWork): string => {
	const author = work.authorships?.[0]?.author?.display_name?.split(/\s+/).at(-1) ?? 'openalex'
	const titleWord = (work.title ?? work.display_name ?? 'work').match(/[A-Za-z0-9]+/)?.[0] ?? 'work'
	return `${author}${work.publication_year ?? ''}${titleWord}`.replace(/[^A-Za-z0-9_-]/g, '')
}

const makeBibtex = (work: OpenAlexWork, doi?: string): string => {
	const type = work.type === 'book'
		? 'book'
		: work.type === 'dissertation'
			? 'phdthesis'
			: work.primary_location?.source?.type === 'journal'
				? 'article'
				: 'misc'
	const authors = work.authorships
		?.map((authorship) => authorship.author?.display_name)
		.filter((name): name is string => Boolean(name))
		.join(' and ')
	const fields = [
		`  title = {${cleanBibtexValue(work.title ?? work.display_name)}}`,
		authors ? `  author = {${cleanBibtexValue(authors)}}` : '',
		work.publication_year ? `  year = {${work.publication_year}}` : '',
		work.primary_location?.source?.display_name
			? `  journal = {${cleanBibtexValue(work.primary_location.source.display_name)}}`
			: '',
		work.biblio?.volume ? `  volume = {${cleanBibtexValue(work.biblio.volume)}}` : '',
		makePages(work) ? `  pages = {${cleanBibtexValue(makePages(work))}}` : '',
		doi ? `  doi = {${cleanBibtexValue(doi)}}` : '',
		work.id ? `  url = {${cleanBibtexValue(work.id)}}` : '',
	].filter(Boolean)

	return `@${type}{${makeBibtexKey(work)},\n${fields.join(',\n')}\n}`
}

export const restoreOpenAlexAbstract = (
	invertedIndex: Record<string, number[]> | null | undefined
): string | undefined => {
	if (!invertedIndex) return undefined

	const words = Object.entries(invertedIndex)
		.flatMap(([word, positions]) => positions.map((position) => ({ word, position })))
		.sort((left, right) => left.position - right.position)
		.map(({ word }) => word)

	return words.length > 0 ? words.join(' ') : undefined
}

export const mapOpenAlexWork = (work: OpenAlexWork): Reference => {
	const doi = stripPrefix(work.doi ?? work.ids?.doi, 'https://doi.org/')
	const openAccessUrl = work.best_oa_location?.pdf_url
		?? work.open_access?.oa_url
		?? work.best_oa_location?.landing_page_url
		?? undefined
	const journalName = work.primary_location?.source?.display_name
		?? work.best_oa_location?.source?.display_name
		?? undefined
	const fieldsOfStudy = [
		work.primary_topic?.display_name,
		work.primary_topic?.subfield?.display_name,
		work.primary_topic?.field?.display_name,
		work.primary_topic?.domain?.display_name,
	].filter((field, index, fields): field is string =>
		Boolean(field) && fields.indexOf(field) === index
	)

	return {
		paperId: `OpenAlex:${stripPrefix(work.id, 'https://openalex.org/') ?? work.id}`,
		externalIds: {
			DOI: doi,
			PubMedCentral: stripPrefix(
				work.ids?.pmcid,
				'https://www.ncbi.nlm.nih.gov/pmc/articles/'
			)?.replace(/\/$/, ''),
		},
		url: work.best_oa_location?.landing_page_url
			?? openAccessUrl
			?? work.id,
		title: work.title ?? work.display_name ?? undefined,
		abstract: restoreOpenAlexAbstract(work.abstract_inverted_index),
		venue: journalName,
		year: work.publication_year?.toString(),
		referenceCount: work.referenced_works_count ?? 0,
		citationCount: work.cited_by_count ?? 0,
		influentialCitationCount: 0,
		isOpenAccess: work.open_access?.is_oa ?? Boolean(openAccessUrl),
		openAccessPdf: openAccessUrl
			? {
				url: openAccessUrl,
				status: work.open_access?.oa_status,
			}
			: undefined,
		fieldsOfStudy,
		publicationTypes: work.type ? [work.type] : undefined,
		publicationDate: work.publication_date ?? undefined,
		journal: {
			name: journalName,
			pages: makePages(work),
			volume: work.biblio?.volume ?? undefined,
		},
		citationStyles: {
			bibtex: makeBibtex(work, doi),
		},
		authors: work.authorships?.map((authorship) => ({
			authorId: stripPrefix(authorship.author?.id, 'https://openalex.org/'),
			name: authorship.author?.display_name,
		})),
		dataProvider: 'openalex',
	}
}
