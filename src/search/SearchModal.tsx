import { ButtonComponent, Modal, Setting, TextComponent, Notice } from 'obsidian';
import { ViewManager } from 'src/data/viewManager';
import { getPaperIds } from 'src/utils/parser';
import ReferenceMap from 'src/main';
import { Reference } from 'src/apis/s2agTypes';
import { RELOAD, SEARCH_PROVIDER, SEARCH_PROVIDER_LABEL, SearchProvider } from 'src/types';

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
                if (paperIds.size > 0) {
                    const paperPromises = Array.from(paperIds).map(
                        (paperId) => viewManager.getIndexPaper(paperId, false)
                    );
                    const papers = await Promise.all(paperPromises);
                    const validPapers = papers.filter(
                        (paper): paper is Reference => Boolean(paper)
                    );
                    if (validPapers.length > 0) {
                        this.callback(null, validPapers);
                        this.close();
                        return;
                    }
                    this.setBusy(false);
                    new Notice(
                        this.plugin.settings.openAccessOnly
                            ? `No open access results found for "${this.query}"`
                            : `No results found for "${this.query}"`
                    );
                    return;
                } else {
                    const searchResults = await viewManager.searchIndexPapers(this.query, this.plugin.settings.modalSearchLimit, false)
                    this.setBusy(false);

                    if (!searchResults?.length) {
                        new Notice(
                            this.plugin.settings.openAccessOnly
                                ? `No open access results found for "${this.query}"`
                                : `No results found for "${this.query}"`
                        );
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
            void this.searchReference();
        }
    }

    onOpen() {
        const { contentEl } = this;

        const search_heading = contentEl.createDiv({ cls: 'lf-search-modal-input-heading', text: 'Search References' });
        search_heading.createDiv({ cls: 'lf-search-modal-input-heading-mode', text: `${this.mode}` });

        new Setting(contentEl)
            .setName('Search source')
            .setDesc(
                this.plugin.settings.openAccessOnly
                    ? 'Only results with a usable open-access location are included.'
                    : 'Restricted results are included for institutional-library users.'
            )
            .addDropdown(dropdown => dropdown
                .addOption(SEARCH_PROVIDER.OPENALEX, SEARCH_PROVIDER_LABEL.OPENALEX)
                .addOption(SEARCH_PROVIDER.SEMANTIC_SCHOLAR, SEARCH_PROVIDER_LABEL.SEMANTIC_SCHOLAR)
                .addOption(SEARCH_PROVIDER.BOTH, SEARCH_PROVIDER_LABEL.BOTH)
                .setValue(this.provider)
                .onChange(async (value) => {
                    this.provider = value as SearchProvider;
                    this.plugin.settings.modalSearchProvider = this.provider;
                    this.plugin.referenceMapData.viewManager.clearCache();
                    await this.plugin.saveSettings();
                    if (this.plugin.view) {
                        void this.plugin.referenceMapData.reload(RELOAD.VIEW);
                    }
                    this.contentEl.empty();
                    this.onOpen();
                }));

        contentEl.createDiv({ cls: 'lf-search-modal-input' }, settingItem => {
            new TextComponent(settingItem)
                .setValue(this.query)
                .setPlaceholder('Search by keyword, title, authors, journal, abstract, ID, doi, etc.')
                .onChange(value => (this.query = value))
                .inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
                    this.submitEnterCallback(event);
                });
        });

        new Setting(contentEl)
            .setClass('lf-search-modal-input-button')
            .addButton(btn => {
                return (this.okBtnRef = btn
                    .setButtonText('Search')
                    .setCta()
                    .onClick(() => {
                        void this.searchReference();
                    }));
            });
    }

    onClose() {
        this.contentEl.empty();
    }
}
