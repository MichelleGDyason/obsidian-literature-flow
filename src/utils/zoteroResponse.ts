import { CSLList, PartialCSLEntry } from 'src/types'

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const getString = (value: unknown): string | undefined =>
	typeof value === 'string' && value.length > 0 ? value : undefined

const responsePreview = (body: string): string => {
	const preview = body.trim().replace(/\s+/g, ' ').slice(0, 160)
	return preview || 'empty response'
}

export const normalizeZoteroEntries = (
	value: unknown,
	requireCitekey: boolean
): CSLList => {
	if (!Array.isArray(value)) {
		throw new Error('Better BibTeX returned a bibliography that is not an array.')
	}

	const entries: CSLList = []
	for (const valueEntry of value) {
		if (!isRecord(valueEntry)) continue

		const citekey =
			getString(valueEntry.citekey) ??
			getString(valueEntry['citation-key'])
		const id = requireCitekey ? citekey : citekey ?? getString(valueEntry.id)
		if (!id) continue

		const entry: PartialCSLEntry = {
			...valueEntry,
			id,
			title: getString(valueEntry.title) ?? '',
			...(citekey ? { citekey } : {}),
		}
		entries.push(entry)
	}

	return entries
}

export const parseZoteroCache = (body: string): CSLList => {
	let parsed: unknown
	try {
		parsed = JSON.parse(body) as unknown
	} catch {
		throw new Error(
			`The cached Zotero bibliography is invalid JSON (${responsePreview(body)}).`
		)
	}
	return normalizeZoteroEntries(parsed, false)
}

export const parseZoteroJsonRpcList = (
	body: string,
	context: string
): CSLList => {
	let parsed: unknown
	try {
		parsed = JSON.parse(body) as unknown
	} catch {
		throw new Error(
			`${context} returned invalid JSON (${responsePreview(body)}).`
		)
	}

	if (!isRecord(parsed)) {
		throw new Error(`${context} returned an invalid response.`)
	}

	if (isRecord(parsed.error)) {
		const message = getString(parsed.error.message) ?? 'Unknown Better BibTeX error'
		throw new Error(`${context} failed: ${message}`)
	}

	if (!('result' in parsed)) {
		throw new Error(`${context} returned no result.`)
	}

	return normalizeZoteroEntries(parsed.result, true)
}
