export type OpenAlexResponse = {
	results: OpenAlexWork[]
}

export type OpenAlexWork = {
	id: string
	doi?: string | null
	ids?: {
		doi?: string
		mag?: number | string
		openalex?: string
		pmid?: string
		pmcid?: string
	}
	title?: string | null
	display_name?: string | null
	abstract_inverted_index?: Record<string, number[]> | null
	authorships?: OpenAlexAuthorship[]
	publication_year?: number | null
	publication_date?: string | null
	primary_location?: OpenAlexLocation | null
	best_oa_location?: OpenAlexLocation | null
	open_access?: {
		is_oa?: boolean
		oa_status?: string
		oa_url?: string | null
	} | null
	referenced_works?: string[]
	referenced_works_count?: number
	cited_by_count?: number
	biblio?: {
		volume?: string | null
		issue?: string | null
		first_page?: string | null
		last_page?: string | null
	} | null
	type?: string
	primary_topic?: {
		display_name?: string
		subfield?: { display_name?: string }
		field?: { display_name?: string }
		domain?: { display_name?: string }
	} | null
}

export type OpenAlexAuthorship = {
	author?: {
		id?: string
		display_name?: string
	}
}

export type OpenAlexLocation = {
	is_oa?: boolean
	landing_page_url?: string | null
	pdf_url?: string | null
	license?: string | null
	version?: string | null
	source?: {
		display_name?: string
		type?: string
	} | null
}
