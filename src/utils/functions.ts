import { MetadataCache, Notice, TFile, Vault } from 'obsidian'
import { IndexPaper, MetaData } from 'src/types'
import { templateReplace } from './postprocess';
import { AllCanvasNodeData, CanvasData } from 'obsidian/canvas';
import { Reference } from 'src/apis/s2agTypes';

export function splitString(str: string | undefined, length: number) {
	if (!str) return ''
	const regex = new RegExp("(\\S{" + length + "})", "g");
	return str.replace(regex, "$1 ");
}

export const getLinkedFiles = (file: TFile, metadataCache: MetadataCache) => {
	if (file) {
		const links = metadataCache.getFileCache(file)?.links
		// IF this links exist in the vault as markdown files then get the file path
		if (links) {
			return links.map((link) => metadataCache.getFirstLinkpathDest(link.link, ''))
		}
	}
	return []
}

export const fragWithHTML = (html: string): string =>
	html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1')
		.replace(/<[^>]+>/g, '')

export const errorlog = (data: Record<string, unknown>) => {
	console.error({ plugin: 'Zotero Annotations', ...data })
}

export const isEmpty = (obj: Reference): boolean => {
	return Object.keys(obj).length === 0
}

export function areSetsEqual<T>(as: Set<T>, bs: Set<T>) {
	if (as.size !== bs.size) return false
	return Array.from(as).every((element) => {
		return bs.has(element)
	})
}

export function areArraysEqual<T>(left: T[], right: T[]): boolean {
	return left.length === right.length &&
		left.every((value, index) => value === right[index])
}

export function uniqueBy<T, K>(items: T[], getKey: (item: T) => K): T[] {
	const seen = new Set<K>()
	return items.filter((item) => {
		const key = getKey(item)
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})
}

export function camelToNormalCase(str: string) {
	return str.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) {
		return str.toUpperCase()
	})
}

export function copyToClipboard(text: string): void {
	void activeWindow.navigator.clipboard.writeText(text)
		.then(() => new Notice('Copied to clipboard'))
		.catch(() => new Notice('Unable to copy to clipboard'))
}

export function removeNullReferences(references: IndexPaper[]) {
	return references.filter(element => element.paper && element.paper.paperId !== null);
}

export function makeFileName(metaData: MetaData, fileNameFormat?: string) {
	let output;
	if (fileNameFormat) {
		output = templateReplace(fileNameFormat, metaData);
	} else {
		output = metaData.title;
	}
	return replaceIllegalFileNameCharactersInString(output) + '.md';
}

export function replaceIllegalFileNameCharactersInString(text: string) {
	return text.replace(/[\\,#%&{}/*<>$":@?.]/g, '').replace(/\s+/g, ' ');
}

export async function getCanvasContent(fileCache: string, vault: Vault) {
	let content = '';
	const canvasJson = JSON.parse(fileCache) as CanvasData;
	const nodes: AllCanvasNodeData[] = canvasJson.nodes;
	if (nodes) {
		for (const node of nodes) {
			switch (node.type) {
				case 'text': {
					content += node.text;
					break;
				}
				case 'link': {
					content += node.url;
					break;
				}
				case 'file': {
					if (node.file) {
						try {
							const file = vault.getAbstractFileByPath(node.file);
							if (file instanceof TFile) {
								const temContent = await vault.read(file);
								content += temContent;
							} else {
								content += node.file;
							}
						} catch {
							content += '';
						}
					}
					break;
				}
			}
		}
		fileCache += content;
	}
	return fileCache;
}
