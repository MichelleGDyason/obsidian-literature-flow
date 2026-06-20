import { MatchSource } from 'src/types';
import { Reference } from 'src/apis/s2agTypes';

export function getSearchTerms(query: string): string[] {
	return query
		.split('+')
		.map((term) => term.trim())
		.filter(Boolean);
}

export function formatSearchTerms(query: string): string {
	return getSearchTerms(query).join(' ');
}

export function makeMatchSource(
	type: MatchSource['type'],
	query: string,
	frontmatterKey?: string,
	paper?: Reference
): MatchSource | undefined {
	const terms = getSearchTerms(query);
	if (terms.length === 0) return undefined;
	const matchedTerms = paper ? getMatchedTerms(terms, paper) : [];
	const display = matchedTerms.length > 0
		? matchedTerms.join(', ')
		: terms.join(' ');
	const label = type === 'frontmatter'
		? `Frontmatter terms: ${frontmatterKey || 'keywords'}`
		: 'Filename terms';

	return {
		type,
		label,
		query,
		display,
		terms,
		matchedTerms,
	};
}

export function meetsMinimumMatchedTerms(
	source: MatchSource | undefined,
	minimum: number
): boolean {
	if (!source) return false;
	const normalizedMinimum = Math.max(0, Math.floor(minimum || 0));
	if (normalizedMinimum === 0) return true;
	const requiredTerms = Math.min(normalizedMinimum, source.terms.length);
	return source.matchedTerms.length >= requiredTerms;
}

export function getMatchedTerms(terms: string[], paper: Reference): string[] {
	const searchableText = getSearchableText(paper);
	const matched: string[] = [];
	const seen = new Set<string>();
	terms.forEach((term) => {
		const normalizedTerm = term.toLocaleLowerCase();
		if (seen.has(normalizedTerm)) return;
		if (hasTerm(searchableText, normalizedTerm)) {
			seen.add(normalizedTerm);
			matched.push(term);
		}
	});
	return matched;
}

function getSearchableText(paper: Reference): string {
	const externalIds = paper.externalIds
		? Object.values(paper.externalIds)
		: [];
	const authors = [
		...(paper.authors ?? []),
		...(paper.directors ?? []),
		...(paper.editors ?? []),
	].map((author) => author.name);
	const values = [
		paper.title,
		paper.abstract,
		paper.venue,
		paper.year,
		paper.url,
		paper.openAccessPdf?.url,
		paper.journal?.name,
		paper.publisher,
		...(paper.fieldsOfStudy ?? []),
		...(paper.publicationTypes ?? []),
		...authors,
		...externalIds,
	];
	return values
		.filter((value): value is string => Boolean(value))
		.join(' ')
		.toLocaleLowerCase();
}

function hasTerm(text: string, term: string): boolean {
	const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapedTerm}([^\\p{L}\\p{N}]|$)`, 'iu');
	return pattern.test(text);
}

export function mergeMatchSources(
	...sourceLists: Array<MatchSource[] | undefined>
): MatchSource[] | undefined {
	const merged: MatchSource[] = [];
	const seen = new Set<string>();

	sourceLists.forEach((sources) => {
		sources?.forEach((source) => {
			const key = `${source.type}:${source.label}:${source.query}`;
			if (seen.has(key)) return;
			seen.add(key);
			merged.push(source);
		});
	});

	return merged.length > 0 ? merged : undefined;
}
