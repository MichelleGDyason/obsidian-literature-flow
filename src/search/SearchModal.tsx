import { ButtonComponent, Modal, Setting, TextComponent, Notice } from 'obsidian';
import { ViewManager } from 'src/data/viewManager';
import { getPaperIds } from 'src/utils/parser';
import ReferenceMap from 'src/main';
import { Reference } from 'src/apis/s2agTypes';
import { SEARCH_PROVIDER, SearchProvider } from 'src/types';

export class ReferenceSearchModal extends Modal {
    private isBusy = false;
    private okBtnRef?: ButtonComponent;
    private provider: SearchProvider;

    constructor(
        private plugin: ReferenceMap,
        private query: string,
        private mode: string,
        private callback: (error: Error | null, results?: Reference[]) => void,
    ) {
        super(plugin.app);
        this.provider = plugin.settings.modalSearchProvider;
    }

    setBusy(busy: boolean) {
        this.isBusy = busy;
        this.okBtnRef?.setDisabled(busy);
        this.okBtnRef?.setButtonText(busy ? 'Requesting...' : 'Search');
    }

    async searchReference() {
        if (!this.query.trim()) {
            new Notice('Enter a search query.');
            return;
        }

        if (!this.isBusy) {
            try {
                this.setBusy(true);
                const paperIds = getPaperIds(this.query);
                const viewManager = new ViewManager(this.plugin);
                if (this.provider === SEARCH_PROVIDER.OPENALEX) {
                    const doi = Array.from(paperIds).find((paperId) => /^10\./i.test(paperId));
                    const searchResults = doi
                        ? [await viewManager.getOpenAccessPaperByDoi(doi)].filter(
                            (paper): paper is Reference => paper !== null
                        )
                        : await viewManager.searchOpenAccessPapers(
                            this.query,
                            this.plugin.settings.modalSearchLimit,
                            false
                        );
                    this.setBusy(false);
                    if (!searchResults.length) {
                        new Notice(`No open access results found for "${this.query}"`);
                        return;
                    }
                    this.callback(null, searchResults);
                    this.close();
                    return;
                }

                if (paperIds.size > 0) {
                    const paperPromises = Array.from(paperIds).map((paperId) => new ViewManager(this.plugin).getIndexPaper(paperId));
                    const papers = await Promise.all(paperPromises);
                    const validPapers = papers.filter((paper) => paper !== null) as Reference[];
                    if (validPapers.length > 0) {
                        this.callback(null, validPapers);
                        this.close();
                        return;
                    }
                    this.setBusy(false);
                    new Notice(`No results found for "${this.query}"`);
                    return;
                } else {
                    const searchResults = await viewManager.searchIndexPapers(this.query, this.plugin.settings.modalSearchLimit, false)
                    this.setBusy(false);

                    if (!searchResults?.length) {
                        new Notice(`No results found for "${this.query}"`);
                        return;
                    }
                    this.callback(null, searchResults);
                    this.close();
                }
            } catch (err) {
                this.setBusy(false);
                const error = err instanceof Error ? err : new Error(String(err));
                if (this.plugin.settings.debugMode) {
                    console.error('LF: Online search failed', error);
                }
                new Notice(error.message, 8000);
            }
        }
    }

    submitEnterCallback(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.isComposing) {
            this.searchReference();
        }
    }

    onOpen() {
        const { contentEl } = this;

        const search_heading = contentEl.createDiv({ cls: 'lf-search-modal-input-heading', text: 'Search References' });
        search_heading.createDiv({ cls: 'lf-search-modal-input-heading-mode', text: `${this.mode}` });

        new Setting(contentEl)
            .setName('Search source')
            .setDesc(
                this.provider === SEARCH_PROVIDER.OPENALEX
                    ? 'OpenAlex searches open access works only.'
                    : 'Semantic Scholar searches its full paper index.'
            )
            .addDropdown(dropdown => dropdown
                .addOption(SEARCH_PROVIDER.SEMANTIC_SCHOLAR, 'Semantic Scholar')
                .addOption(SEARCH_PROVIDER.OPENALEX, 'OpenAlex (open access only)')
                .setValue(this.provider)
                .onChange(async (value) => {
                    this.provider = value as SearchProvider;
                    this.plugin.settings.modalSearchProvider = this.provider;
                    await this.plugin.saveSettings();
                    this.contentEl.empty();
                    this.onOpen();
                }));

        contentEl.createDiv({ cls: 'lf-search-modal-input' }, settingItem => {
            new TextComponent(settingItem)
                .setValue(this.query)
                .setPlaceholder('Search by keyword, title, authors, journal, abstract, ID, DOI, etc.')
                .onChange(value => (this.query = value))
                .inputEl.addEventListener('keydown', this.submitEnterCallback.bind(this));
        });

        new Setting(contentEl)
            .setClass('lf-search-modal-input-button')
            .addButton(btn => {
                return (this.okBtnRef = btn
                    .setButtonText('Search')
                    .setCta()
                    .onClick(() => {
                        this.searchReference();
                    }));
            });
    }

    onClose() {
        this.contentEl.empty();
    }
}
