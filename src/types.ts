import { CiteKeyEntry } from "./apis/bibTypes"
import { Reference } from "./apis/s2agTypes"

export const SEARCH_PROVIDER = {
	SEMANTIC_SCHOLAR: 'semantic-scholar',
	OPENALEX: 'openalex',
	BOTH: 'both',
} as const

export const SEARCH_PROVIDER_LABEL = {
	SEMANTIC_SCHOLAR: 'Semantic Scholar',
	OPENALEX: 'OpenAlex',
	BOTH: 'OpenAlex + Semantic Scholar',
} as const

export type SearchProvider = typeof SEARCH_PROVIDER[keyof typeof SEARCH_PROVIDER]

export type ReferenceMapSettings = {
	hideButtonsOnHover: boolean
	influentialCount: boolean
	showAbstract: boolean
	showAuthors: boolean
	showJournal: boolean
	abstractTruncateLength: number
	filterRedundantReferences: boolean
	lookupLinkedFiles: boolean
	searchTitle: boolean
	searchLimit: number
	searchFrontMatter: boolean
	searchFrontMatterKey: string
	searchFrontMatterLimit: number
	searchCiteKey: boolean
	pullFromZotero: boolean
	zoteroGroups: ZoteroGroup[] 
	zoteroPort: string
	searchCiteKeyPath: string
	autoUpdateCitekeyFile: boolean
	linkCiteKey: boolean
	findZoteroCiteKeyFromID: boolean
	findCiteKeyFromLinksWithoutPrefix: boolean
	citedLimit: number
	citingLimit: number
	enableReferenceSorting: boolean
	sortByReference: string
	sortOrderReference: string
	enableIndexSorting: boolean
	sortByIndex: string
	sortOrderIndex: string
	modalSearchProvider: SearchProvider
	openAccessOnly: boolean
	institutionalAccessUrlTemplate: string
	openAlexApiKey: string
	modalSearchLimit: number
	fileNameFormat: string
	folder: string
	useVaultCreateTemplates: boolean
	articleTemplatePath: string
	bookTemplatePath: string
	modalCreateTemplate: string
	modalInsertTemplate: string
	formatMetadataCopyOne: boolean
	formatMetadataCopyTwo: boolean
	formatMetadataCopyThree: boolean
	metadataCopyTemplateOne: string
	metadataCopyTemplateTwo: string
	metadataCopyTemplateThree: string
	metadataCopyOneBatch: boolean
	metadataCopyTwoBatch: boolean
	metadataCopyThreeBatch: boolean
	debugMode: boolean
	isLocalExclusive: boolean
	// CSL Settings
	cslStyle: string
	citationStylePath: string
	cslLocale: string
	defaultStyleURL: string
	defaultLocale: string
}
export type MetaData = {
	bibtex: string
	title: string
	author: string
	authors: string
	year: string
	journal: string
	volume: string
	issue: string
	pages: string
	abstract: string
	url: string
	pdfurl: string
	doi: string
	publisher: string
	publicationType: string
	citekey: string
	referenceCount: number
	citationCount: number
	influentialCount: number
	csl?: string
}

export type IndexPaper = {
	id: string
	location: number | null
	isLocal?: boolean
	paper: Reference
	bibEntry?: CiteKeyEntry
}

export type CiteKey = {
	citeKey: string
	location: number
	paperId: string
}

export type Library = {
	active: boolean
	adapter: string
	libraryData: CiteKeyEntry[] | null
	mtime: number
}

export const RELOAD = {
	HARD: 'hard',
	SOFT: 'soft',
	VIEW: 'view'
} as const

export type Reload = typeof RELOAD[keyof typeof RELOAD]

export const DIRECTION = { LEFT: 'left', RIGHT: 'right' } as const

export type Direction = typeof DIRECTION[keyof typeof DIRECTION]

export type CSLList = PartialCSLEntry[];

export type PartialCSLEntry = {
	id: string;
	title?: string;
	groupID?: number;
	citekey?: string;
	'citation-key'?: string;
	[key: string]: unknown;
}

export type ZoteroGroup = {
	id: number;
	name: string;
	lastUpdate?: number;
}

export type CardSpecType = 'media' | 'image' | 'pdf' | 'text' | 'file' | 'link';

export interface LocalCache {
	styleURL: string;
	locale: string;
	styleCache: Map<string, string>;
	localeCache: Map<string, string>;
}

export type BibData = {
	id: string;
	index: number;
	bib: string;
}
