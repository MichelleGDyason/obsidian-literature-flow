import React from 'react'
import { METADATA_COPY_TEMPLATE_ONE, METADATA_COPY_TEMPLATE_THREE, METADATA_COPY_TEMPLATE_TWO, } from 'src/constants'
import { OpenAccessIcon, CopyIconOne, CopyIconTwo, CopyIconThree } from 'src/icons'
import { IndexPaper, ReferenceMapSettings } from 'src/types'
import { hasOpenAccessLocation } from 'src/utils/access'
import { copyToClipboard } from 'src/utils/functions'
import { makeMetaData, templateReplace } from 'src/utils/postprocess'

type Props = {
	settings: ReferenceMapSettings
	paper: IndexPaper
	showCountButtons?: boolean
	setShowReferences?: React.Dispatch<React.SetStateAction<boolean>>
	showReferences?: boolean
	setShowCitations?: React.Dispatch<React.SetStateAction<boolean>>
	showCitations?: boolean
	setIsButtonShown?: React.Dispatch<React.SetStateAction<boolean>>
	isButtonShown?: boolean
	batchCopyMetadataOne?: string
	batchCopyMetadataTwo?: string
	batchCopyMetadataThree?: string
}

export const PaperButtons = ({
	settings,
	paper,
	showCountButtons = true,
	setShowReferences = undefined,
	showReferences = false,
	setShowCitations = undefined,
	showCitations = false,
	setIsButtonShown = undefined,
	isButtonShown = false,
	batchCopyMetadataOne = '',
	batchCopyMetadataTwo = '',
	batchCopyMetadataThree = '',
}: Props) => {
	const metadataTemplateOne = settings.formatMetadataCopyOne
		? settings.metadataCopyTemplateOne
		: METADATA_COPY_TEMPLATE_ONE

	const metadataTemplateTwo = settings.formatMetadataCopyTwo
		? settings.metadataCopyTemplateTwo
		: METADATA_COPY_TEMPLATE_TWO

	const metadataTemplateThree = settings.formatMetadataCopyThree
		? settings.metadataCopyTemplateThree
		: METADATA_COPY_TEMPLATE_THREE

	// set csl for the paper 
	const metaData = makeMetaData(paper)
	let copyMetadataOne = ''
	let copyMetadataTwo = ''
	let copyMetadataThree = ''
	if (settings.formatMetadataCopyOne) {
		if (settings.metadataCopyOneBatch && batchCopyMetadataOne) {
			copyMetadataOne = batchCopyMetadataOne
		} else {
			copyMetadataOne = templateReplace(
				metadataTemplateOne,
				metaData,
				paper.id
			)
		}
	}
	if (settings.formatMetadataCopyTwo) {
		if (settings.metadataCopyTwoBatch && batchCopyMetadataTwo) {
			copyMetadataTwo = batchCopyMetadataTwo
		} else {
			copyMetadataTwo = templateReplace(
				metadataTemplateTwo,
				metaData,
				paper.id
			)
		}
	}
	if (settings.formatMetadataCopyThree) {
		if (settings.metadataCopyThreeBatch && batchCopyMetadataThree) {
			copyMetadataThree = batchCopyMetadataThree
		} else {
			copyMetadataThree = templateReplace(
				metadataTemplateThree,
				metaData,
				paper.id
			)
		}
	}

	let citingCited = null
	const isReferenceCount = metaData.referenceCount > 0
	const isCitationCount = metaData.citationCount > 0

	const handleShowReferencesClick = () => {
		if (setShowReferences && setShowCitations && setIsButtonShown) {
			setShowReferences(!showReferences);
			setShowCitations(false);
			if (showReferences || showCitations) {
				setIsButtonShown(true);
			}
		}
	};

	const handleShowCitationsClick = () => {
		if (setShowCitations && setShowReferences && setIsButtonShown) {
			setShowCitations(!showCitations);
			setShowReferences(false);
			if (showReferences || showCitations) {
				setIsButtonShown(true);
			}
		}
	};

	const renderButton = (showCondition: boolean, clickHandler: () => void, count: number, className: string, isEnabled: boolean) => (
		<div
			className={isEnabled ? className : 'lf-button-disabled'}
			style={
				showCondition && isEnabled
					? {
						fontWeight: 'bold',
						color: 'var(--text-accent)',
					}
					: {}
			}
			onClick={isEnabled ? clickHandler : undefined}
		>
			{count}
		</div>
	);

	citingCited = (
		<>
			{!paper.isLocal &&
				<>
				{renderButton(showReferences, handleShowReferencesClick, metaData.referenceCount, "lf-button-references", isReferenceCount && showCountButtons)}
				{renderButton(showCitations, handleShowCitationsClick, metaData.citationCount, "lf-button-citations", isCitationCount && showCountButtons)}
					{settings.influentialCount && (
						<div className="lf-button-disabled">
							{metaData.influentialCount}
						</div>
					)}
				</>
			}
			{paper.isLocal &&
				<div className="lf-is-local lf-button-disabled">
					Local Library
				</div>
			}
		</>
	);

	return (
		<div className="lf-paper-buttons">
			{settings.formatMetadataCopyOne && (
				<div
					className="lf-copy-metadata-one"
					onClick={() => {
						copyToClipboard(copyMetadataOne)
					}}
				>
					<CopyIconOne />
				</div>
			)}
			{settings.formatMetadataCopyTwo && (
				<div
					className="lf-copy-metadata-two"
					onClick={() => {
						copyToClipboard(copyMetadataTwo)
					}}
				>
					<CopyIconTwo />
				</div>
			)}
			{settings.formatMetadataCopyThree && (
				<div
					className="lf-copy-metadata-three"
					onClick={() => {
						copyToClipboard(copyMetadataThree)
					}}
				>
					<CopyIconThree />
				</div>
			)}
			{hasOpenAccessLocation(paper.paper) ? (
				<div className="lf-openaccess">
					<a href={metaData.pdfurl}>
						<OpenAccessIcon />
					</a>
				</div>
			) : (
				<div className="lf-button-disable">
						<OpenAccessIcon />
				</div>
			)}
			{citingCited}
		</div>
	)
}
