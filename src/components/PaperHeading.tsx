import React from 'react';
import { IndexPaper, MatchSource, ReferenceMapSettings } from 'src/types';
import { getAuthorUrl, getPaperUrl } from 'src/utils/access';
import { splitString } from 'src/utils/functions';

type PaperHeadingProps = {
	paper: IndexPaper;
	settings: ReferenceMapSettings;
}

export const PaperHeading = ({ paper, settings }: PaperHeadingProps) => {
	const { authors, directors, editors, title, year, abstract, url } = paper.paper;
	const authorID = authors?.[0]?.authorId;
	const authorUrl = getAuthorUrl(paper.paper, authorID);
	const isCitekey = paper?.id?.includes('@');
	const showCitekey = settings.linkCiteKey && isCitekey;
	const isLocal = paper.isLocal;

	const splitTitle = splitString(title, 20);
	const splitAbstract = splitString(abstract, 20);

	const Title = () => {
		const targetUrl = isLocal ? url : getPaperUrl(paper.paper, settings);
		let formatTitle = (
			<span className="lf-paper-title lf-paper-title-disabled">
				{(paper.location && !settings.lookupLinkedFiles) &&
					<span className="lf-paper-tag">{paper.location}</span>
				}
				{' ' + (splitTitle || 'Unknown Title') + ' '}
			</span>
		)
		if (targetUrl) {
			formatTitle = (
				<a href={targetUrl}>
					{(paper.location && !settings.lookupLinkedFiles) &&
						<span className="lf-paper-tag">{paper.location}</span>
					}
					{' ' + (splitTitle || 'Unknown Title') + ' '}
				</a>
			)
		}

		return (
			<div className="lf-paper-title">
				{formatTitle}
			</div>
		);
	}

	const Abstract = () => {
		const className = isLocal ? "lf-paper-abstract lf-paper-abstract-disabled" : "lf-paper-abstract"
		let truncatedAbstract = splitAbstract
		if (settings.abstractTruncateLength > 0 && truncatedAbstract.length > settings.abstractTruncateLength) {
			truncatedAbstract = splitAbstract.slice(0, settings.abstractTruncateLength) + ' ...'
		}
		return (
			<div className={className}>
				{' ' + (truncatedAbstract || '') + ' '}
			</div >
		);
	}

	const Authors = (all = false) => {
		if (isLocal) {
			if (!all) {
				return (
					<span className="lf-paper-authors lf-paper-authors-disabled">
						{(authors && authors.length > 0 ? authors[0].name : '') + ' '}
						{(directors && directors.length > 0 ? directors[0].name : '') + ' '}
						{(editors && editors.length > 0 ? editors[0].name : '') + ' '}
						{year}
					</span>
				)
			} else {
				return (
					<span className="lf-paper-authors lf-paper-authors-disabled">
						{(authors || []).map((author) => author.name).join(', ') + ' '}
						{(directors || []).map((director) => director.name).join(', ') + ' '}
						{(editors || []).map((editor) => editor.name).join(', ') + ' '}
						{year}
					</span>
				);
			}
		} else {
			const authorText = !all
				? (authors?.[0]?.name || 'Unknown Author') + ' ' + year
				: (authors || []).map((author) => author.name).join(', ') + ' ' + year
			if (!authorUrl) {
				return <span className="lf-paper-authors">{authorText}</span>
			}
			if (!all) {
				return (
					<span className="lf-paper-authors">
						<a href={authorUrl}>
							{authorText}
						</a>
					</span>
				)
			} else {
				return (
					<span className="lf-paper-authors">
						<a href={authorUrl}>
							{authorText}
						</a>
					</span>
				);
			}
		}

	}

	const Journal = () => {
		const className = "lf-paper-journal lf-paper-journal-disabled"
		const journalParts = [
			paper.paper.journal?.name,
			paper.paper.journal?.volume,
			paper.paper.journal?.pages
		];
		const journal = journalParts.filter(Boolean).join(', ');
		return (
			<div className={className}>
				{journal}
			</div >
		);

	}

	const getMatchSourceTitle = (source: MatchSource) => {
		const sourceName = source.type === 'frontmatter'
			? `frontmatter terms from ${source.label.replace('Frontmatter terms: ', '')}`
			: 'filename terms';
		if (source.matchedTerms.length > 0) {
			return `${source.matchedTerms.length} of ${source.terms.length} ${sourceName} were found in this result: ${source.matchedTerms.join(', ')}. Full query sent: ${source.query}`;
		}
		return `Returned by the ${sourceName}, but no exact query terms were found in the returned metadata. Full query sent: ${source.query}`;
	}

	const CardTags = () => {
		return (
			<div className='lf-paper-tags'>
				{showCitekey && (
					<span className="lf-paper-tag">
						<a href={`zotero://select/items/${paper?.id}`}>
							{paper?.id}
						</a>
					</span>
				)}
				{paper.paper.publicationTypes && paper.paper.publicationTypes.map((type, index) => (
					<span key={`z${index}`} className="lf-paper-tag">
						{type}
					</span>
				))}
				{(isLocal && paper.paper.type) && <span className="lf-paper-tag">
					{paper.paper.type}
				</span>
				}
				{!isLocal && paper.paper.dataProvider && (
					<span className="lf-paper-tag">
						{paper.paper.dataProvider === 'openalex' ? 'OpenAlex' : 'Semantic Scholar'}
					</span>
				)}
				{!isLocal && paper.paper.isOpenAccess && (
					<span className="lf-paper-tag">Open access</span>
				)}
				{!isLocal && !paper.paper.isOpenAccess && !settings.openAccessOnly && (
					<span className="lf-paper-tag">Institutional access</span>
				)}
				{paper.matchSources?.map((source, index) => (
					<span
						key={`match-${index}`}
						className="lf-paper-tag lf-paper-match-source"
						title={getMatchSourceTitle(source)}
					>
						{source.label}: {source.display}
					</span>
				))}
			</div>
		);
	}

	return (
		<div className="lf-paper-heading">
			<Title />
			{settings.showAuthors && (
				Authors(true)
			)}
			{!settings.showAuthors && (
				Authors()
			)}
			{settings.showJournal && (
				<Journal />
			)}
			{settings.showAbstract && (
				<Abstract />
			)}
			<CardTags />
		</div>
	);
};

export default PaperHeading;
