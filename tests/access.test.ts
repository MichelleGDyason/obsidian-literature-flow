import assert from 'node:assert/strict'
import test from 'node:test'
import { Reference } from '../src/apis/s2agTypes'
import {
	filterByAccess,
	getPaperUrl,
	mergeReferences,
} from '../src/utils/access'

const openAlexPaper: Reference = {
	paperId: 'OpenAlex:W123',
	title: 'Shared research',
	year: '2026',
	externalIds: { DOI: '10.1234/shared' },
	isOpenAccess: true,
	openAccessPdf: { url: 'https://repository.example/shared.pdf' },
	dataProvider: 'openalex',
}

test('open-access filtering requires a usable open location', () => {
	const papers: Reference[] = [
		openAlexPaper,
		{
			paperId: 'closed',
			isOpenAccess: false,
		},
		{
			paperId: 'missing-location',
			isOpenAccess: true,
		},
	]

	assert.deepEqual(filterByAccess(papers, true), [openAlexPaper])
	assert.deepEqual(filterByAccess(papers, false), papers)
})

test('merged provider results prefer the OpenAlex copy for a DOI', () => {
	const semanticScholarPaper: Reference = {
		...openAlexPaper,
		paperId: 'semantic-id',
		openAccessPdf: { url: 'https://publisher.example/shared.pdf' },
		dataProvider: 'semantic-scholar',
	}

	assert.deepEqual(
		mergeReferences([semanticScholarPaper], [openAlexPaper]),
		[openAlexPaper]
	)
})

test('combined results interleave both providers', () => {
	const semanticScholarPaper: Reference = {
		paperId: 'semantic-only',
		title: 'Semantic result',
		dataProvider: 'semantic-scholar',
	}
	const secondOpenAlexPaper: Reference = {
		paperId: 'OpenAlex:W456',
		title: 'Second OpenAlex result',
		dataProvider: 'openalex',
	}

	assert.deepEqual(
		mergeReferences(
			[openAlexPaper, secondOpenAlexPaper],
			[semanticScholarPaper]
		).map((paper) => paper.paperId),
		['OpenAlex:W123', 'semantic-only', 'OpenAlex:W456']
	)
})

test('paper links prefer the open-access file', () => {
	assert.equal(
		getPaperUrl(openAlexPaper, {
			openAccessOnly: true,
			institutionalAccessUrlTemplate: '',
		}),
		'https://repository.example/shared.pdf'
	)
})

test('institutional templates route restricted DOI links', () => {
	const closedPaper: Reference = {
		paperId: 'closed',
		externalIds: { DOI: '10.1234/closed' },
		isOpenAccess: false,
		dataProvider: 'semantic-scholar',
	}

	assert.equal(
		getPaperUrl(closedPaper, {
			openAccessOnly: false,
			institutionalAccessUrlTemplate:
				'https://library.example/login?url={{url}}&doi={{doi}}',
		}),
		'https://library.example/login?url=https%3A%2F%2Fdoi.org%2F10.1234%2Fclosed&doi=10.1234%2Fclosed'
	)
	assert.equal(
		getPaperUrl(closedPaper, {
			openAccessOnly: true,
			institutionalAccessUrlTemplate:
				'https://library.example/login?url={{url}}',
		}),
		undefined
	)
})
