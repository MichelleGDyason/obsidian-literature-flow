import tsparser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import obsidianmd from 'eslint-plugin-obsidianmd'

export default defineConfig([
	{
		ignores: [
			'main.js',
			'node_modules/**',
			'*.mjs',
			'src/utils/cslLangList.ts',
			'src/utils/cslList.ts',
		],
	},
	...obsidianmd.configs.recommended,
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
])
