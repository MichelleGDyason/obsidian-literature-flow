// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { AbstractInputSuggest, App, TAbstractFile, TFile, TFolder } from "obsidian";
import { cslList } from "src/utils/cslList";
import { cslLangList } from "src/utils/cslLangList";

abstract class LiteratureInputSuggest<T> extends AbstractInputSuggest<T> {
    protected readonly inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    protected choose(value: string): void {
        this.setValue(value);
        this.inputEl.trigger("input");
        this.close();
    }
}

export class FileSuggest extends LiteratureInputSuggest<TFile> {
    getSuggestions(inputStr: string): TFile[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const files: TFile[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        abstractFiles.forEach((file: TAbstractFile) => {
            if (
                file instanceof TFile &&
                file.extension === "md" &&
                file.path.toLowerCase().contains(lowerCaseInputStr)
            ) {
                files.push(file);
            }
        });

        return files;
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TFile): void {
        this.choose(file.path);
    }
}

export class FolderSuggest extends LiteratureInputSuggest<TFolder> {
    getSuggestions(inputStr: string): TFolder[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        abstractFiles.forEach((folder: TAbstractFile) => {
            if (
                folder instanceof TFolder &&
                folder.path.toLowerCase().contains(lowerCaseInputStr)
            ) {
                folders.push(folder);
            }
        });

        return folders;
    }

    renderSuggestion(file: TFolder, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TFolder): void {
        this.choose(file.path);
    }
}


export class CSLListSuggest extends LiteratureInputSuggest<string> {
    getSuggestions(inputStr: string): string[] {
        const lowerCaseInputStr = inputStr.toLowerCase();
        const listItem = cslList.filter(item => item.label.toLowerCase().contains(lowerCaseInputStr))
        return listItem.map(item => item.label);
    }

    renderSuggestion(item: string, el: HTMLElement): void {
        el.setText(item);
    }

    selectSuggestion(item: string): void {
        this.choose(item);
    }
}

export class CSLLocaleSuggest extends LiteratureInputSuggest<string> {
    getSuggestions(inputStr: string): string[] {
        const lowerCaseInputStr = inputStr.toLowerCase();
        const listItem = cslLangList.filter(item => item.label.toLowerCase().contains(lowerCaseInputStr))
        return listItem.map(item => item.label);
    }

    renderSuggestion(item: string, el: HTMLElement): void {
        el.setText(item);
    }

    selectSuggestion(item: string): void {
        this.choose(item);
    }
}
