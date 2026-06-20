import { MatchSource } from 'src/types';

export function formatSearchTerms(query: string): string {
	return query
		.split('+')
		.map((term) => term.trim())
		.filter(Boolean)
		.join(' ');
}

export function makeMatchSource(
	type: MatchSource['type'],
	query: string,
	frontmatterKey?: string
): MatchSource | undefined {
	const display = formatSearchTerms(query);
	if (!display) return undefined;
	const label = type === 'frontmatter'
		? `Frontmatter: ${frontmatterKey || 'keywords'}`
		: 'Filename';

	return {
		type,
		label,
		query,
		display,
	};
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
