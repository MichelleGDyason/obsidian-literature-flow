import assert from 'node:assert/strict'
import test from 'node:test'
import {
	formatSearchTerms,
	getMatchedTerms,
	makeMatchSource,
	meetsMinimumMatchedTerms,
	mergeMatchSources,
} from '../src/utils/matchSource'

test('match source formats plus-joined query terms for display', () => {
	assert.equal(formatSearchTerms('open+access+independent+scholars'), 'open access independent scholars')
})

test('frontmatter match source records the configured key and raw query', () => {
	assert.deepEqual(
		makeMatchSource('frontmatter', 'autoencoders+machine+learning', 'keywords'),
		{
			type: 'frontmatter',
			label: 'Frontmatter terms: keywords',
			query: 'autoencoders+machine+learning',
			display: 'autoencoders machine learning',
			terms: ['autoencoders', 'machine', 'learning'],
			matchedTerms: [],
		}
	)
})

test('match source displays terms found in each paper result', () => {
	assert.deepEqual(
		makeMatchSource(
			'filename',
			'williams+ethics+knowledge+reflection',
			undefined,
			{
				paperId: 'paper-1',
				title: 'Williams on Ethics, Knowledge, and Reflection',
				authors: [{ name: 'A. W. Moore' }],
			}
		),
		{
			type: 'filename',
			label: 'Filename terms',
			query: 'williams+ethics+knowledge+reflection',
			display: 'williams, ethics, knowledge, reflection',
			terms: ['williams', 'ethics', 'knowledge', 'reflection'],
			matchedTerms: ['williams', 'ethics', 'knowledge', 'reflection'],
		}
	)
})

test('term matching uses whole words to avoid misleading partial matches', () => {
	assert.deepEqual(
		getMatchedTerms(
			['md', 'ethics'],
			{
				paperId: 'paper-1',
				title: 'A method for ethics education',
			}
		),
		['ethics']
	)
})

test('minimum matched terms filter rejects weak dynamic results', () => {
	const source = makeMatchSource(
		'filename',
		'moore+williams+ethics+knowledge+reflection',
		undefined,
		{
			paperId: 'paper-1',
			title: 'Ethics and invertebrates',
		}
	)

	assert.equal(meetsMinimumMatchedTerms(source, 1), true)
	assert.equal(meetsMinimumMatchedTerms(source, 2), false)
	assert.equal(meetsMinimumMatchedTerms(source, 0), true)
})

test('minimum matched terms never requires more terms than the query has', () => {
	const source = makeMatchSource(
		'filename',
		'ethics+knowledge',
		undefined,
		{
			paperId: 'paper-1',
			title: 'Ethics and Knowledge',
		}
	)

	assert.equal(meetsMinimumMatchedTerms(source, 3), true)
})

test('match source merge keeps each distinct search explanation once', () => {
	const filenameSource = makeMatchSource('filename', 'attention+all+need')
	const frontmatterSource = makeMatchSource('frontmatter', 'transformers', 'keywords')

	assert.deepEqual(
		mergeMatchSources(
			filenameSource ? [filenameSource] : undefined,
			frontmatterSource ? [frontmatterSource] : undefined,
			filenameSource ? [filenameSource] : undefined
		),
		[
			filenameSource,
			frontmatterSource,
		]
	)
})
