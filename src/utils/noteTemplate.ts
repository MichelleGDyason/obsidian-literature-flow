import { Reference } from 'src/apis/s2agTypes'
import { MetaData } from 'src/types'

export type CreateTemplateKind = 'article' | 'book'

const normalizedType = (value: string): string =>
	value.toLowerCase().replace(/[^a-z0-9]+/g, '')

export const getCreateTemplateKind = (
	reference: Reference
): CreateTemplateKind => {
	const types = [
		reference.type,
		...(reference.publicationTypes ?? []),
	]
		.filter((value): value is string => Boolean(value))
		.map(normalizedType)

	return types.some((type) =>
		type === 'book'
		|| type === 'bookchapter'
		|| type === 'monograph'
		|| type === 'editedbook'
	)
		? 'book'
		: 'article'
}

const shouldFill = (value: unknown): boolean =>
	value === null
	|| value === undefined
	|| (typeof value === 'string' && (
		value.trim() === ''
		|| value.trim().endsWith('?')
	))

const yamlKey = (value: string): string =>
	value.toLowerCase().replace(/[\s-]+/g, '_')

const usable = (value: string): string =>
	value.startsWith('Could not recover')
		|| value === 'No abstract available'
		|| value === 'No BibTex available'
		? ''
		: value

export const getTemplateFrontmatterValues = (
	metaData: MetaData,
	kind: CreateTemplateKind
): Record<string, string> => ({
	abstract: usable(metaData.abstract),
	author: usable(metaData.authors),
	authors: usable(metaData.authors),
	citekey: usable(metaData.citekey),
	doi: usable(metaData.doi),
	issue: usable(metaData.issue),
	journal: usable(metaData.journal),
	pages: usable(metaData.pages),
	pdf_url: usable(metaData.pdfurl),
	publication: usable(metaData.journal),
	publication_type: kind === 'book' ? 'Book' : 'Journal article',
	publisher: usable(metaData.publisher),
	source: usable(metaData.journal) || usable(metaData.publisher),
	source_url: usable(metaData.url),
	title: usable(metaData.title),
	type: 'reading_note',
	url: usable(metaData.url),
	volume: usable(metaData.volume),
	year: usable(metaData.year),
})

export const fillTemplateFrontmatter = (
	frontmatter: Record<string, unknown>,
	metaData: MetaData,
	kind: CreateTemplateKind
): Record<string, unknown> => {
	const values = getTemplateFrontmatterValues(metaData, kind)
	const result = { ...frontmatter }

	for (const key of Object.keys(result)) {
		const value = values[yamlKey(key)]
		if (value && shouldFill(result[key])) {
			result[key] = value
		}
	}

	return result
}
