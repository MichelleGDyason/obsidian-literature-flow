import React, { useEffect, useState } from 'react'
import { IndexPaper } from 'src/types'
import { makeMetaData, templateReplace } from 'src/utils/postprocess'
import { PaperList } from './PaperList'
import { PaperHeading } from './PaperHeading'
import { PaperButtons } from './PaperButtons'
import { ViewManager } from 'src/data/viewManager'
import { LoadingPuff } from './LoadingPuff'
import { Reference } from 'src/apis/s2agTypes'
import ReferenceMap from 'src/main'

type IndexCardsProps = {
	className?: string
	plugin: ReferenceMap
	indexPaper: IndexPaper
	viewManager: ViewManager
}

export const IndexPaperCard = (props: IndexCardsProps) => {
	const [references, setReferences] = useState<Reference[]>([])
	const [citations, setCitations] = useState<Reference[]>([])
	const [showReferences, setShowReferences] = useState(false)
	const [showCitations, setShowCitations] = useState(false)
	const [isButtonShown, setIsButtonShown] = useState(!props.plugin.settings.hideButtonsOnHover)
	const [isReferenceLoading, setIsReferenceLoading] = useState(false)
	const [isCitationLoading, setIsCitationLoading] = useState(false)
	const [referencesLoaded, setReferencesLoaded] = useState(false)
	const [citationsLoaded, setCitationsLoaded] = useState(false)
	const { settings } = props.plugin

	useEffect(() => {
		setReferences([])
		setCitations([])
		setReferencesLoaded(false)
		setCitationsLoaded(false)
		setShowReferences(false)
		setShowCitations(false)
	}, [props.indexPaper.paper.paperId])

	useEffect(() => {
		if (showReferences && !referencesLoaded) {
			void getReferences()
		}
	}, [showReferences, referencesLoaded])

	useEffect(() => {
		if (showCitations && !citationsLoaded) {
			void getCitations()
		}
	}, [showCitations, citationsLoaded])

	useEffect(() => {
		setIsButtonShown(!settings.hideButtonsOnHover)
	}, [settings.hideButtonsOnHover])

	const handleHoverButtons = (isShow: boolean) => {
		if (!settings.hideButtonsOnHover || showReferences || showCitations) {
			setIsButtonShown(true);
			return;
		}
		setIsButtonShown(isShow);
	};

	const getReferences = async () => {
		setIsReferenceLoading(true);
		const references = await props.viewManager.getReferences(props.indexPaper.paper);
		const filteredReferences = settings.filterRedundantReferences
			? references.filter((reference) => (reference.referenceCount && reference.referenceCount > 0) || (reference.citationCount && reference.citationCount > 0))
			: references;
		setReferences(filteredReferences);
		setReferencesLoaded(true);
		setIsReferenceLoading(false);
	};

	const getCitations = async () => {
		setIsCitationLoading(true);
		const citations = await props.viewManager.getCitations(props.indexPaper.paper);
		const filteredCitations = settings.filterRedundantReferences
			? citations.filter((citation) => (citation.referenceCount && citation.referenceCount > 0) || (citation.citationCount && citation.citationCount > 0))
			: citations;
		setCitations(filteredCitations);
		setCitationsLoaded(true);
		setIsCitationLoading(false);
	};

	const metadataTemplates = [
		{ format: settings.formatMetadataCopyOne, template: settings.metadataCopyTemplateOne, batch: settings.metadataCopyOneBatch },
		{ format: settings.formatMetadataCopyTwo, template: settings.metadataCopyTemplateTwo, batch: settings.metadataCopyTwoBatch },
		{ format: settings.formatMetadataCopyThree, template: settings.metadataCopyTemplateThree, batch: settings.metadataCopyThreeBatch },
	]

	const batchCopyMetadata = metadataTemplates.flatMap(({ format, template, batch }) => {
		if (batch && format) {
			return references.map((paper) => {
				const metaData = makeMetaData({ id: paper.paperId, location: null, paper: paper })
				return templateReplace(template, metaData) + '\n'
			})
		}
		return []
	})

	return (
		<div
			className={`lf-root-paper ${props.className}`}
			onMouseEnter={() => handleHoverButtons(true)}
			onMouseLeave={() => handleHoverButtons(false)}
		>
			<PaperHeading paper={props.indexPaper} settings={settings} />
			<PaperButtons
				settings={settings}
				paper={props.indexPaper}
				showActionButtons={isButtonShown}
				setShowReferences={setShowReferences}
				showReferences={showReferences}
				setShowCitations={setShowCitations}
				showCitations={showCitations}
				setIsButtonShown={setIsButtonShown}
				isButtonShown={isButtonShown}
				batchCopyMetadataOne={batchCopyMetadata[0]}
				batchCopyMetadataTwo={batchCopyMetadata[1]}
				batchCopyMetadataThree={batchCopyMetadata[2]}
			/>
			{(isCitationLoading || isReferenceLoading) && (
				<div className="lf-loading">
					<LoadingPuff />
				</div>
			)}
			{showReferences && (
				<PaperList
					settings={settings}
					papers={references}
					type={'References'}
					renderPaper={(paper, index) => (
						<IndexPaperCard
							key={`${paper.paperId}-${index}`}
							plugin={props.plugin}
							indexPaper={{
								id: paper.paperId,
								location: null,
								paper,
							}}
							viewManager={props.viewManager}
						/>
					)}
				/>
			)}
			{showCitations && (
				<PaperList
					settings={settings}
					papers={citations}
					type={'Citations'}
					renderPaper={(paper, index) => (
						<IndexPaperCard
							key={`${paper.paperId}-${index}`}
							plugin={props.plugin}
							indexPaper={{
								id: paper.paperId,
								location: null,
								paper,
							}}
							viewManager={props.viewManager}
						/>
					)}
				/>
			)}
		</div>
	)
}
