import { parse } from '@retorquere/bibtex-parser'
import { CiteKey, IndexPaper, Library, LocalCache, RELOAD, Reload } from 'src/types';
import { DEFAULT_LIBRARY, EXCLUDE_FILE_NAMES } from 'src/constants';
import { getCanvasContent, getLinkedFiles, removeNullReferences } from 'src/utils/functions'
import { convertToCiteKeyEntry, fillMissingReference, indexSort, setCiteKeyId } from 'src/utils/postprocess';
import { PromiseCapability } from 'src/promise';
import { getZBib } from 'src/utils/zotero';
import ReferenceMap from 'src/main';
import { ViewManager } from './viewManager';
import { CiteKeyEntry } from 'src/apis/bibTypes';
import { getCSLLocale, getCSLStyle } from 'src/utils/cslHelpers';
import { cslList } from 'src/utils/cslList';
import { cslLangList } from 'src/utils/cslLangList'
import { MetadataCache, normalizePath, Notice, TFile, Vault } from 'obsidian';
import { makeMatchSource, mergeMatchSources } from 'src/utils/matchSource';

export class ReferenceMapData {
    plugin: ReferenceMap
    library: Library
    viewManager: ViewManager
    initPromise: PromiseCapability<void>;
    cache: LocalCache;

    constructor(plugin: ReferenceMap) {
        this.plugin = plugin
        this.library = DEFAULT_LIBRARY
        this.viewManager = new ViewManager(plugin)
        this.initPromise = new PromiseCapability();
        this.cache = {
            styleURL: '',
            locale: '',
            styleCache: new Map<string, string>(),
            localeCache: new Map<string, string>()
        }
    }

    async loadCache() {
        const { cacheDir, settings } = this.plugin;
        const adapter = this.plugin.app.vault.adapter;
        if (!(await adapter.exists(cacheDir))) {
            await adapter.mkdir(cacheDir);
        }
        this.cache.styleURL = cslList.find((item) => item.label === settings.cslStyle)?.value ?? settings.defaultStyleURL
        this.cache.locale = cslLangList.find((item) => item.label === settings.cslLocale)?.value ?? settings.defaultLocale
        // The following will set the style cache and localeCache
        const citationStyle = await getCSLStyle(this.cache.styleCache, adapter, cacheDir, this.cache.styleURL);
        const citationLocale = await getCSLLocale(this.cache.localeCache, adapter, cacheDir, this.cache.locale);

        if (citationStyle && citationLocale) {
            return true;
        }
        return false;
    }

    async reload(reloadType: Reload) {
        if (reloadType === RELOAD.HARD) {
            this.viewManager.clearCache()
            this.library.mtime = 0;
            await this.loadLibrary(false)
            void this.loadCache()
            this.plugin.updateChecker.library = this.library;
            void this.plugin.view?.processReferences()
        } else if (reloadType === RELOAD.SOFT) {
            await this.loadLibrary(false)
            this.viewManager.clearCache()
            this.plugin.updateChecker.library = this.library;
            void this.plugin.view?.processReferences()
        } else if (reloadType === RELOAD.VIEW) {
            void this.plugin.view?.processReferences()
        }
    }

    async reinit(clearCache: boolean) {
        this.initPromise = new PromiseCapability();
        if (this.plugin.settings.pullFromZotero) {
            await this.loadBibFileFromCache(false);
        } else {
            await this.loadBibFileFromCache(true);
        }

        this.initPromise.resolve();
    }

    async loadBibFileFromCache(fromCache?: boolean) {
        const { settings, cacheDir } = this.plugin;
        const adapter = this.plugin.app.vault.adapter;
        if (!settings.zoteroGroups?.length) return;

        const bib: CiteKeyEntry[] = [];
        const issues: string[] = [];
        for (const group of settings.zoteroGroups) {
            try {
                const result = await getZBib(
                    settings.zoteroPort,
                    adapter,
                    cacheDir,
                    group.id,
                    fromCache
                );
                if (result?.entries.length) {
                    bib.push(...result.entries);
                    if (result.source === 'live') {
                        group.lastUpdate = Date.now();
                    }
                }
                if (result?.warning) {
                    issues.push(`${group.name}: ${result.warning}`);
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                issues.push(`${group.name}: ${message}`);
            }
        }
        if (issues.length > 0) {
            new Notice(
                `Literature Flow could not refresh some Zotero libraries. Cached data was used when available. ${issues.join(' ')}`,
                12000
            );
        }
        this.library = {
            active: true,
            adapter: 'csl-json',
            libraryData: bib,
            mtime: Date.now(),
        };
        return bib;
    }

    loadBibFileFromUserPath = async () => {
        const { searchCiteKey, searchCiteKeyPath } = this.plugin.settings;
        if (!searchCiteKey || !searchCiteKeyPath) return null;
        const libraryPath = normalizePath(searchCiteKeyPath);
        const adapter = this.plugin.app.vault.adapter;
        try {
            const stats = await adapter.stat(libraryPath);
            if (!stats) return null;
            const mtime = stats.mtime;
            if (mtime === this.library.mtime) return null;

            let rawData;
            try {
                rawData = await adapter.read(libraryPath);
            } catch {
                return null;
            }

            const isJson = searchCiteKeyPath.endsWith('.json');
            const isBib = searchCiteKeyPath.endsWith('.bib');
            if (!isJson && !isBib) return null;

            let libraryData: CiteKeyEntry[];
            try {
                if (isJson) {
                    libraryData = JSON.parse(rawData) as CiteKeyEntry[];
                } else {
                    // the key property in Entry and id property in CiteKeyEntry are the same
                    const parsedEntries: unknown = parse(rawData, { errorHandler: () => { } }).entries;
                    libraryData = parsedEntries as CiteKeyEntry[];
                }
            } catch {
                return null;
            }

            this.library = {
                active: true,
                adapter: isJson ? 'csl-json' : 'bibtex',
                libraryData,
                mtime,
            };
            return libraryData;
        }
        catch {
            return null;
        }
    }

    loadLibrary = async (fromCache?: boolean) => {
        if (this.plugin.settings.searchCiteKey && this.plugin.settings.pullFromZotero) {
            await this.loadBibFileFromCache(fromCache);
            this.plugin.updateChecker.library = this.library;
            return
        } else if (this.plugin.settings.searchCiteKey && this.plugin.settings.searchCiteKeyPath) {
            await this.loadBibFileFromUserPath();
            this.plugin.updateChecker.library = this.library;
            return
        } else {
            this.library = DEFAULT_LIBRARY
        }
    };

    prepare = async (activeFile: TFile | null | undefined, vault: Vault, metadataCache: MetadataCache) => {
        let isUpdate = false
        if (!activeFile) {
            this.plugin.updateChecker.resetCache()
            this.plugin.updateChecker.basename = ''
            isUpdate = true
        } else {
            const settings = this.plugin.settings
            let fileCache = ''
            let isFm = false, isFn = false, isIdx = false, isCite = false;
            this.plugin.updateChecker.basename = activeFile.basename
            try {
                fileCache = await vault.cachedRead(activeFile);
            } catch {
                fileCache = await vault.read(activeFile);
            }
            if (activeFile.extension === 'canvas') {
                fileCache += await getCanvasContent(fileCache, vault)
            }
            if (settings.lookupLinkedFiles) {
                const linkedFiles = getLinkedFiles(activeFile, metadataCache)
                for (const file of linkedFiles) {
                    if (file) {
                        const cache = await vault.cachedRead(file)
                        fileCache += cache
                    }
                }
            }
            const fileMetadataCache = metadataCache.getFileCache(activeFile);
            const isLibrary = settings.searchCiteKey && this.library.libraryData !== null
            if (isLibrary && settings.autoUpdateCitekeyFile) {
                void this.loadLibrary(false)
            }
            this.plugin.updateChecker.setCache(fileCache, fileMetadataCache)
            const prefix = settings.findCiteKeyFromLinksWithoutPrefix ? '' : '@';

            if (settings.searchFrontMatter) isFm = this.plugin.updateChecker.checkFrontmatterUpdate(settings.searchFrontMatterKey)
            if (settings.searchTitle) isFn = this.plugin.updateChecker.checkFileNameUpdate()
            if (settings.searchCiteKey) isCite = this.plugin.updateChecker.checkCiteKeysUpdate(prefix)
            isIdx = this.plugin.updateChecker.checkIndexIdsUpdate()
            isUpdate = isFm || isFn || isIdx || isCite
        }
        return isUpdate
    }

    getLocalReferences = async (citeKeyMap: CiteKey[] = []) => {
        const indexCards: IndexPaper[] = [];
        if (citeKeyMap.length === 0) return indexCards;
        citeKeyMap.forEach((item: CiteKey): void => {
            const localPaper = this.library.libraryData?.find((entry) => entry.id === item.citeKey.replace('@', '')) as CiteKeyEntry;
            if (localPaper) {
                const paper_ = fillMissingReference(localPaper);
                indexCards.push({
                    id: item.citeKey,
                    location: item.location,
                    isLocal: true,
                    paper: paper_,
                    bibEntry: localPaper
                });
            }
        });
        return indexCards;
    }

    getIndexCards = async (
        indexIds: Set<string>,
        citeKeyMap: CiteKey[],
        fileName: string,
        frontmatter: string,
        basename: string,

    ) => {
        const indexCards: IndexPaper[] = [];
        const settings = this.plugin.settings
        // Get references using the paper IDs
        if (indexIds.size > 0) {
            await Promise.all(
                [...indexIds].map(async (paperId) => {
                    const paper = await this.viewManager.getIndexPaper(paperId);
                    if (paper && paper.paperId) {
                        const paperCiteId =
                            settings.searchCiteKey &&
                                this.library.libraryData !== null &&
                                settings.findZoteroCiteKeyFromID
                                ? setCiteKeyId(paperId, this.library)
                                : paperId;
                        indexCards.push({
                            id: paperCiteId,
                            location: null,
                            isLocal: false,
                            paper: paper,
                            bibEntry: undefined
                        });
                    }
                })
            );
        }

        // Get references using the cite keys
        if (citeKeyMap.length > 0 && settings.searchCiteKey) {
            await Promise.all(
                citeKeyMap.map(async (item): Promise<void> => {
                    const localPaper = this.library.libraryData?.find((entry) => entry.id === item.citeKey.replace('@', ''));
                    if (localPaper) {
                        let isLocal = true;
                        let paper = fillMissingReference(localPaper);
                        if (item.citeKey !== item.paperId) {
                            const indexPaper = await this.viewManager.getIndexPaper(item.paperId);
                            if (indexPaper && indexPaper.paperId) {
                                paper = fillMissingReference(localPaper, indexPaper);
                                isLocal = false;
                            }
                        }
                        indexCards.push({
                            id: item.citeKey,
                            location: item.location,
                            isLocal: isLocal,
                            paper: paper,
                            bibEntry: localPaper
                        });
                    }
                })
            );
        }

        // Get references using the file name
        if (settings.searchTitle && fileName && !EXCLUDE_FILE_NAMES.some(
            (name) => basename.toLowerCase() === name.toLowerCase())
        ) {
            const matchSource = makeMatchSource('filename', fileName);
            const titleSearchPapers = await this.viewManager.searchIndexPapers(
                fileName,
                settings.searchLimit
            );
            titleSearchPapers.forEach((paper) => {
                indexCards.push({
                    id: paper.paperId,
                    location: null,
                    isLocal: false,
                    paper,
                    matchSources: matchSource ? [matchSource] : undefined,
                });
            });
        }

        // Get references using the front matter
        if (settings.searchFrontMatter && frontmatter) {
            const matchSource = makeMatchSource('frontmatter', frontmatter, settings.searchFrontMatterKey);
            const frontMatterPapers = await this.viewManager.searchIndexPapers(
                frontmatter, settings.searchFrontMatterLimit);
            frontMatterPapers.forEach((paper) => {
                indexCards.push({
                    id: paper.paperId,
                    location: null,
                    isLocal: false,
                    paper,
                    matchSources: matchSource ? [matchSource] : undefined,
                });
            });
        }

        const indexCards_ = this.preProcessReferences(indexCards);
        if (indexCards_.length > 0) {
            const CiteKeyEntry = indexCards_.map((indexPaper) => {
                return convertToCiteKeyEntry(indexPaper, indexPaper.id);
            });

            this.plugin.updateChecker.checkCSlEngineUpdate(
                CiteKeyEntry,
                this.cache.styleCache.get(this.cache.styleURL) as string,
                this.cache.localeCache.get(this.cache.locale) as string
            );
            const bibData = this.plugin.updateChecker.getCSL(CiteKeyEntry.map(item => item.id));
            if (bibData) {
                const indexCardsMap = new Map(indexCards_.map(item => [item.id, item]));
                bibData.forEach((item) => {
                    const paper = indexCardsMap.get(item.id);
                    if (paper) {
                        paper.paper.csl = item.bib;
                    }
                });
            }
        }
        return indexCards_
    };


    preProcessReferences = (indexCards: IndexPaper[]) => {
        let indexCardsTemp = removeNullReferences(indexCards);

        // This sorting has to be first because it is based on the location
        // of the reference in the file. Otherwise de-duplication will remove the
        // duplicate references with locations

        if (!this.plugin.settings.enableIndexSorting) {
            indexCardsTemp = indexCardsTemp.sort((a, b) => {
                if (a.location === null) return 1;
                if (b.location === null) return -1;
                return a.location - b.location;
            });
        }

        indexCardsTemp = this.mergeDuplicateIndexCards(indexCardsTemp);

        if (this.plugin.settings.enableIndexSorting) {
            indexCardsTemp = indexSort(
                indexCardsTemp,
                this.plugin.settings.sortByIndex,
                this.plugin.settings.sortOrderIndex
            );
        }

        return indexCardsTemp
    }

    mergeDuplicateIndexCards = (indexCards: IndexPaper[]) => {
        const indexCardMap = new Map<string, IndexPaper>();
        indexCards.forEach((item) => {
            const key = item.paper.paperId;
            const existing = indexCardMap.get(key);
            if (!existing) {
                indexCardMap.set(key, item);
                return;
            }
            existing.matchSources = mergeMatchSources(existing.matchSources, item.matchSources);
            if (existing.location === null && item.location !== null) {
                existing.location = item.location;
            }
            if (!existing.bibEntry && item.bibEntry) {
                existing.bibEntry = item.bibEntry;
            }
        });
        return Array.from(indexCardMap.values());
    }
}
