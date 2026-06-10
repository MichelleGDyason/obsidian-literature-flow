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
	showActionButtons?: boolean
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
	showActionButtons = true,
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

	const renderButton = (
		showCondition: boolean,
		clickHandler: () => void,
		count: number,
		className: string,
		isEnabled: boolean,
		title: string
	) => (
		<div
			className={isEnabled ? className : 'lf-button-disabled'}
			title={title}
			aria-label={`${title}: ${count}`}
			role={isEnabled ? 'button' : undefined}
			tabIndex={isEnabled ? 0 : undefined}
			style={
				showCondition && isEnabled
					? {
						fontWeight: 'bold',
						color: 'var(--text-accent)',
					}
					: {}
			}
			onClick={isEnabled ? clickHandler : undefined}
			onKeyDown={isEnabled ? (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					clickHandler()
				}
			} : undefined}
		>
			{count}
		</div>
	);

	citingCited = (
		<>
			{!paper.isLocal &&
				<>
				{renderButton(
					showReferences,
					handleShowReferencesClick,
					metaData.referenceCount,
					"lf-button-references",
					isReferenceCount && showCountButtons && Boolean(setShowReferences),
					'References cited by this work'
				)}
				{renderButton(
					showCitations,
					handleShowCitationsClick,
					metaData.citationCount,
					"lf-button-citations",
					isCitationCount && showCountButtons && Boolean(setShowCitations),
					'Works citing this reference'
				)}
					{settings.influentialCount && (
						<div
							className="lf-button-disabled"
							title="Influential citation count"
						>
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
			{showActionButtons && settings.formatMetadataCopyOne && (
				<div
					className="lf-copy-metadata-one"
					onClick={() => {
						copyToClipboard(copyMetadataOne)
					}}
				>
					<CopyIconOne />
				</div>
			)}
			{showActionButtons && settings.formatMetadataCopyTwo && (
				<div
					className="lf-copy-metadata-two"
					onClick={() => {
						copyToClipboard(copyMetadataTwo)
					}}
				>
					<CopyIconTwo />
				</div>
			)}
			{showActionButtons && settings.formatMetadataCopyThree && (
				<div
					className="lf-copy-metadata-three"
					onClick={() => {
						copyToClipboard(copyMetadataThree)
					}}
				>
					<CopyIconThree />
				</div>
			)}
			{showActionButtons && hasOpenAccessLocation(paper.paper) ? (
				<div className="lf-openaccess">
					<a href={metaData.pdfurl}>
						<OpenAccessIcon />
					</a>
				</div>
			) : showActionButtons ? (
				<div className="lf-button-disable">
						<OpenAccessIcon />
				</div>
			) : null}
			{citingCited}
		</div>
	)
}
