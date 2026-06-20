import assert from 'node:assert/strict'
import test from 'node:test'
import {
	formatSearchTerms,
	makeMatchSource,
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
			label: 'Frontmatter: keywords',
			query: 'autoencoders+machine+learning',
			display: 'autoencoders machine learning',
		}
	)
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
