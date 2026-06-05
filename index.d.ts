declare module 'citeproc' {
	namespace CSL {
		type System = {
			retrieveLocale: () => string;
			retrieveItem: (id: string) => unknown;
		};

		class Engine {
			constructor(system: System, style: string);
			updateItems(ids: string[]): void;
			makeBibliography(): [
				{ entry_ids: string[][] },
				string[]
			];
		}
	}

	const CSL: {
		Engine: typeof CSL.Engine;
	};

	export = CSL;
}
