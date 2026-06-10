import assert from 'node:assert/strict'
import test from 'node:test'
import { Reference } from '../src/apis/s2agTypes'
import { MetaData } from '../src/types'
import {
	fillTemplateFrontmatter,
	getCreateTemplateKind,
} from '../src/utils/noteTemplate'
import { templateReplace } from '../src/utils/postprocess'

const metaData: MetaData = {
	bibtex: '@article{Lovelace2026Open}',
	title: 'Open research access',
	author: 'Ada Lovelace',
	authors: 'Ada Lovelace, Grace Hopper',
	year: '2026',
	journal: 'Journal of Open Research',
	volume: '5',
	issue: '2',
	pages: '10-18',
	abstract: 'Open research access',
	url: 'https://repository.example/article',
	pdfurl: 'https://repository.example/article.pdf',
	doi: '10.1234/example',
	publisher: 'Open Research Society',
	publicationType: 'article',
	citekey: 'Lovelace2026Open',
	referenceCount: 12,
	citationCount: 34,
	influentialCount: 0,
}

test('selects book templates for books and book chapters', () => {
	const book: Reference = {
		paperId: 'book',
		type: 'book',
	}
	const chapter: Reference = {
		paperId: 'chapter',
		publicationTypes: ['BookChapter'],
	}
	const article: Reference = {
		paperId: 'article',
		type: 'article',
	}

	assert.equal(getCreateTemplateKind(book), 'book')
	assert.equal(getCreateTemplateKind(chapter), 'book')
	assert.equal(getCreateTemplateKind(article), 'article')
})

test('fills matching blank and question-mark YAML fields only', () => {
	const result = fillTemplateFrontmatter({
		author: '',
		title: 'Keep this title',
		publication_type: 'Journal article?',
		type: 'reading_note?',
		doi: null,
		reading_status: ['unread', 'reading'],
		custom_field: '',
	}, metaData, 'article')

	assert.deepEqual(result, {
		author: 'Ada Lovelace, Grace Hopper',
		title: 'Keep this title',
		publication_type: 'Journal article',
		type: 'reading_note',
		doi: '10.1234/example',
		reading_status: ['unread', 'reading'],
		custom_field: '',
	})
})

test('fills book publication type without changing the template body', () => {
	const result = fillTemplateFrontmatter({
		publication_type: 'book?',
		publisher: '',
		source_url: '',
	}, metaData, 'book')

	assert.equal(result.publication_type, 'Book')
	assert.equal(result.publisher, 'Open Research Society')
	assert.equal(result.source_url, 'https://repository.example/article')
})

test('supports expanded Literature Flow placeholders', () => {
	assert.equal(
		templateReplace(
			'{{citekey}} | {{issue}} | {{publisher}} | {{publication_type}} | {{type}}',
			metaData
		),
		'Lovelace2026Open | 2 | Open Research Society | Journal article | reading_note'
	)
})
