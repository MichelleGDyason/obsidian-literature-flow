import assert from 'node:assert/strict'
import test from 'node:test'
import { mapOpenAlexWork, restoreOpenAlexAbstract } from '../src/apis/openAlexMapper'
import { OpenAlexWork } from '../src/apis/openAlexTypes'

test('restores an OpenAlex inverted abstract in word order', () => {
	assert.equal(
		restoreOpenAlexAbstract({
			access: [2],
			Open: [0],
			research: [1],
		}),
		'Open research access'
	)
})

test('maps an open access work into the Reference model', () => {
	const work: OpenAlexWork = {
		id: 'https://openalex.org/W123',
		doi: 'https://doi.org/10.1234/example',
		title: 'Open research access',
		abstract_inverted_index: {
			Open: [0],
			research: [1],
			access: [2],
		},
		authorships: [
			{
				author: {
					id: 'https://openalex.org/A456',
					display_name: 'Ada Lovelace',
				},
			},
		],
		publication_year: 2026,
		publication_date: '2026-01-02',
		primary_location: {
			source: {
				display_name: 'Journal of Open Research',
				type: 'journal',
				host_organization_name: 'Open Research Society',
			},
		},
		best_oa_location: {
			is_oa: true,
			landing_page_url: 'https://example.org/article',
			pdf_url: 'https://example.org/article.pdf',
		},
		open_access: {
			is_oa: true,
			oa_status: 'gold',
			oa_url: 'https://example.org/article.pdf',
		},
		referenced_works_count: 12,
		cited_by_count: 34,
		biblio: {
			volume: '5',
			issue: '2',
			first_page: '10',
			last_page: '18',
		},
		type: 'article',
	}

	const reference = mapOpenAlexWork(work)

	assert.equal(reference.paperId, 'OpenAlex:W123')
	assert.equal(reference.externalIds?.DOI, '10.1234/example')
	assert.equal(reference.abstract, 'Open research access')
	assert.equal(reference.openAccessPdf?.url, 'https://example.org/article.pdf')
	assert.equal(reference.journal?.pages, '10-18')
	assert.equal(reference.journal?.issue, '2')
	assert.equal(reference.publisher, 'Open Research Society')
	assert.equal(reference.authors?.[0]?.name, 'Ada Lovelace')
	assert.match(reference.citationStyles?.bibtex ?? '', /@article\{Lovelace2026Open/)
	assert.match(reference.citationStyles?.bibtex ?? '', /doi = \{10\.1234\/example\}/)
})
