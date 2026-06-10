import {
	getFrontMatterInfo,
	MarkdownView,
	normalizePath,
	Notice,
	parseYaml,
	Plugin,
	stringifyYaml,
	TFile,
	WorkspaceLeaf,
} from 'obsidian'
import { DIRECTION, Direction, MetaData, RELOAD, ReferenceMapSettings } from './types'
import { DEFAULT_SETTINGS, METADATA_MODAL_CREATE_TEMPLATE, METADATA_MODAL_INSERT_TEMPLATE } from './constants'
import { ReferenceMapSettingTab } from './settings/settings'
import { PromiseCapability } from './promise'
import { addIcons } from './icons'
import { SidebarView, REFERENCE_MAP_VIEW_TYPE } from './sidebar/SidebarView'
import { GraphView, REFERENCE_MAP_GRAPH_VIEW_TYPE } from './graph/GraphView';
import { makeFileName } from './utils/functions'
import { makeMetaData, templateReplace } from './utils/postprocess'
import { ReferenceMapData } from './data/data'
import { UpdateChecker } from './data/updateChecker'
import { Reference } from './apis/s2agTypes'
import { ReferenceSearchModal } from './search/SearchModal'
import { ReferenceSuggestModal } from './search/SuggestModal'
import {
	fillTemplateFrontmatter,
	getCreateTemplateKind,
} from './utils/noteTemplate'

export default class ReferenceMap extends Plugin {
	public settings: ReferenceMapSettings
	public cacheDir: string;
	public referenceMapData: ReferenceMapData;
	public updateChecker: UpdateChecker;
	public _initPromise: PromiseCapability<void>;

	get initPromise() {
		if (!this._initPromise) {
			return (this._initPromise = new PromiseCapability());
		}
		return this._initPromise;
	}

	async onload() {
		const pluginDir = this.manifest.dir ??
			`${this.app.vault.configDir}/plugins/${this.manifest.id}`;
		this.cacheDir = normalizePath(`${pluginDir}/cache`);
		this.referenceMapData = new ReferenceMapData(this)
		this.updateChecker = new UpdateChecker()
		void this.loadSettings().then(() => {
			void this.init()
			void this.initPromise.promise
				.then(() => {
					void this.referenceMapData.loadLibrary(true);
					void this.referenceMapData.loadCache()
				})
				.finally(() => {
					this.updateChecker.library = this.referenceMapData.library;
					this.referenceMapData.initPromise.resolve()
				}
				);
			this.initPromise.resolve();
		})

	}

	async init(): Promise<void> {
		addIcons()

		this.addSettingTab(new ReferenceMapSettingTab(this.app, this))

		this.registerView(
			REFERENCE_MAP_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new SidebarView(leaf, this)
		)

		this.registerView(
			REFERENCE_MAP_GRAPH_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new GraphView(leaf, this)
		)

			this.addCommand({
				id: 'show-sidebar-view',
			name: 'Show sidebar view',
			callback: () => {
				this.ensureLeafExists(true)
			},
		})
			this.addCommand({
				id: 'reload-library',
			name: 'Refresh view and library',
			callback: () => {
				if (this.view) {
					void this.referenceMapData.reload(RELOAD.HARD)
				}
			},
		})

			this.addCommand({
				id: 'search-online-insert',
			name: 'Search online and insert',
			callback: () => this.insertMetadata(),
		});

			this.addCommand({
				id: 'search-online-create',
			name: 'Search online and create',
			callback: () => this.createNewReferenceNote(),
		});

			this.addCommand({
				id: "open-literature-graph",
			name: "Open literature graph",
			callback: () => this.openReferenceMapGraph(false),
		});

		this.addCommand({
			id: "convert-selection-zotero-link",
			name: "Convert selection to Zotero link",
			callback: () => this.convertSelectionToZoteroLink(),
		});


		this.app.workspace.onLayoutReady(() => {
			this.ensureLeafExists(false)
		})

		this.addRibbonIcon(
			'LiteratureFlowIconScroll',
			this.manifest.name,
			async (evt: MouseEvent) => {
				this.ensureLeafExists(true)
			}
		)
	}

	ensureLeafExists(active = false): void {
		const { workspace } = this.app

		const preferredSidebar = DIRECTION.RIGHT

			let leaf: WorkspaceLeaf | null
		const existingPluginLeaves = workspace.getLeavesOfType(
			REFERENCE_MAP_VIEW_TYPE
		)

		if (existingPluginLeaves.length > 0) {
			leaf = existingPluginLeaves[0]
			} else {
				leaf =
				(preferredSidebar as Direction) === DIRECTION.LEFT
					? workspace.getLeftLeaf(false)
					: workspace.getRightLeaf(false)
				if (!leaf) return
				void workspace.revealLeaf(leaf)
				void leaf.setViewState({ type: REFERENCE_MAP_VIEW_TYPE })
			}

			if (active && leaf) {
				workspace.setActiveLeaf(leaf)
		}
	}

	// Create the Literature Flow sidebar.
	async activateView() {
		this.app.workspace.detachLeavesOfType(REFERENCE_MAP_VIEW_TYPE)

		const leaf = this.app.workspace.getRightLeaf(false)
		if (!leaf) return
		await leaf.setViewState({
			type: REFERENCE_MAP_VIEW_TYPE,
			active: false,
		})

		void this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(REFERENCE_MAP_VIEW_TYPE)[0]
		)
	}

	// Get the Literature Flow sidebar view.
	get view() {
		const leaves = this.app.workspace.getLeavesOfType(REFERENCE_MAP_VIEW_TYPE)
		if (!leaves?.length) return null
		return leaves[0].view as SidebarView
	}

	async loadSettings() {
		const savedSettings = await this.loadData() as Partial<ReferenceMapSettings> | null
		this.settings = { ...DEFAULT_SETTINGS, ...(savedSettings ?? {}) }
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}

	async createNewReferenceNote(): Promise<void> {
		try {
			const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!markdownView || markdownView.getMode() !== 'source') {
				new Notice('No active Markdown view or in reading view');
				return;
			}
			const selection = markdownView.editor.getSelection().trim();
			const reference = await this.searchReference(selection, 'create');
			const metaData = makeMetaData({
				id: reference.paperId,
				location: null,
				paper: reference,
			});
			const activeLeaf = this.app.workspace.getLeaf();
			if (!activeLeaf) {
				new Notice('No active leaf');
				return;
			}
			const renderedContents = await this.getRenderedContentsForCreate(
				metaData,
				reference
			);
			const fileName = makeFileName(metaData, this.settings.fileNameFormat);
			let filePath;
			if (this.settings.folder) {
				filePath = `${this.settings.folder}/${fileName}`;
			} else {
				filePath = `${fileName}`;
			}
			const targetFile = await this.app.vault.create(filePath, renderedContents);
			await activeLeaf.openFile(targetFile, { state: { mode: 'source' } });
			// activeLeaf.setEphemeralState({ rename: 'all' });
			// await new CursorJumper(this.app).jumpToNextCursorLocation();
		} catch {
			new Notice('Sorry, something went wrong.');
		}
	}

	async insertMetadata(): Promise<void> {
		try {
			const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!markdownView || markdownView.getMode() !== 'source') {
				new Notice('No active Markdown view or in reading view');
				return;
			}
			const selection = markdownView.editor.getSelection().trim();
			const reference = await this.searchReference(selection, 'insert');
			if (!markdownView.editor) {
				return;
			}
			const metaData = makeMetaData({
				id: reference.paperId,
				location: null,
				paper: reference,
			});
			const renderedContents = await this.getRenderedContentsForInsert(metaData);
			markdownView.editor.replaceRange(renderedContents, markdownView.editor.getCursor());
		} catch {
			new Notice('Sorry, something went wrong.');
		}
	}

	async searchReference(query?: string, mode?: string): Promise<Reference> {
		const searchedReferences = await this.openReferenceSearchModal(query, mode);
		return await this.openReferenceSuggestModal(searchedReferences);
	}

	async openReferenceSearchModal(query = '', mode = 'insert'): Promise<Reference[]> {
		return new Promise((resolve, reject) => {
			new ReferenceSearchModal(this, query, mode, (error, results?: Reference[]) => {
				if (error) {
					reject(error);
				} else if (results) {
					resolve(results);
				} else {
					reject(new Error("No results returned"));
				}
			}).open();
		});
	}

	// Assuming the second problem is in a similar function
	async openReferenceSuggestModal(references: Reference[]): Promise<Reference> {
		return new Promise((resolve, reject) => {
			new ReferenceSuggestModal(this.app, references, (error, selectedReference?: Reference) => {
				if (error) {
					reject(error);
				} else if (selectedReference) {
					resolve(selectedReference);
				} else {
					reject(new Error("No reference selected"));
				}
			}).open();
		});
	}

	async getRenderedContentsForInsert(metaData: MetaData): Promise<string> {
		const template = this.settings.modalInsertTemplate || METADATA_MODAL_INSERT_TEMPLATE;
		return templateReplace(template, metaData);
	}

	private fillCreateTemplateFrontmatter(
		content: string,
		metaData: MetaData,
		reference: Reference
	): string {
		const info = getFrontMatterInfo(content)
		if (!info.exists) return content

		try {
			const parsed = parseYaml(info.frontmatter) as Record<string, unknown> | null
			const frontmatter = fillTemplateFrontmatter(
				parsed ?? {},
				metaData,
				getCreateTemplateKind(reference)
			)
			const yaml = stringifyYaml(frontmatter).trimEnd()
			return `${content.slice(0, info.from)}${yaml}\n${content.slice(info.to)}`
		} catch (error) {
			if (this.settings.debugMode) {
				console.error('LF: Could not fill template frontmatter', error)
			}
			return content
		}
	}

	private async getVaultCreateTemplate(
		reference: Reference
	): Promise<string | null> {
		const kind = getCreateTemplateKind(reference)
		const templatePath = kind === 'book'
			? this.settings.bookTemplatePath
			: this.settings.articleTemplatePath
		if (!templatePath.trim()) {
			new Notice(`No ${kind} template is selected. Using the inline create template.`)
			return null
		}

		const file = this.app.vault.getAbstractFileByPath(
			normalizePath(templatePath)
		)
		if (!(file instanceof TFile)) {
			new Notice(`Literature Flow could not find ${kind} template: ${templatePath}`)
			return null
		}
		return this.app.vault.read(file)
	}

	async getRenderedContentsForCreate(
		metaData: MetaData,
		reference: Reference
	): Promise<string> {
		const vaultTemplate = this.settings.useVaultCreateTemplates
			? await this.getVaultCreateTemplate(reference)
			: null
		const template = vaultTemplate
			?? this.settings.modalCreateTemplate
			?? METADATA_MODAL_CREATE_TEMPLATE
		const rendered = templateReplace(template, metaData)
		return vaultTemplate
			? this.fillCreateTemplateFrontmatter(rendered, metaData, reference)
			: rendered
	}

	async openReferenceMapGraph(active = false) {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf;
		const existingPluginLeaves = workspace.getLeavesOfType(REFERENCE_MAP_GRAPH_VIEW_TYPE);
		if (existingPluginLeaves.length > 0) {
			leaf = existingPluginLeaves[0];
		} else {
			leaf = workspace.getLeaf('split', 'vertical');
			void leaf.setViewState({ type: REFERENCE_MAP_GRAPH_VIEW_TYPE });
		}
		if (active) {
			void workspace.revealLeaf(leaf);
		}
	}

	async convertSelectionToZoteroLink() {
		try {
			if (!this.settings.searchCiteKey) {
				new Notice('Please enable get references using citekey in the settings.');
				return;
			}
			const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!markdownView || markdownView.getMode() !== 'source') {
				new Notice('No active Markdown view or in reading view');
				return;
			}

			const selection = markdownView.editor.getSelection().trim();
			const from = markdownView.editor.getCursor("from");
			const to = markdownView.editor.getCursor("to");
			const citeKeys = Array.from(this.updateChecker.citeKeys);
			const foundCiteKey = citeKeys.find(key => selection.includes(key));
			if (foundCiteKey) {
				const renderedContents = `[${selection}](zotero://select/items/@${foundCiteKey})`;
				markdownView.editor.replaceRange(renderedContents, from, to);
				return;
			} else {
				new Notice('No citekey found in the selection.');
				return;
			}
		} catch {
			new Notice('Sorry, something went wrong.');
		}

	}

}
