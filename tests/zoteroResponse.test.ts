import assert from 'node:assert/strict'
import test from 'node:test'
import {
	normalizeZoteroEntries,
	parseZoteroCache,
	parseZoteroJsonRpcList,
} from '../src/utils/zoteroResponse'

test('rejects a plain-text Better BibTeX error response', () => {
	assert.throws(
		() => parseZoteroJsonRpcList(
			'TypeError: Zotero.getActiveZoteroPane() is null',
			'Better BibTeX bibliography search'
		),
		/returned invalid JSON/
	)
})

test('reports JSON-RPC errors', () => {
	assert.throws(
		() => parseZoteroJsonRpcList(
			JSON.stringify({
				jsonrpc: '2.0',
				error: { message: 'Unexpected Zotero Item type "annotation"' },
			}),
			'Better BibTeX bibliography search'
		),
		/Unexpected Zotero Item type "annotation"/
	)
})

test('uses citekeys as bibliography IDs and filters child records', () => {
	const entries = normalizeZoteroEntries([
		{ id: 'ITEM1', citekey: 'Lovelace2026', title: 'Open research' },
		{ id: 'ATTACHMENT1', title: 'PDF attachment' },
	], true)

	assert.deepEqual(entries, [
		{
			id: 'Lovelace2026',
			citekey: 'Lovelace2026',
			title: 'Open research',
		},
	])
})

test('accepts existing cached CSL JSON entries', () => {
	assert.deepEqual(
		parseZoteroCache(JSON.stringify([{ id: 'Lovelace2026', title: 'Open research' }])),
		[{ id: 'Lovelace2026', title: 'Open research' }]
	)
})
