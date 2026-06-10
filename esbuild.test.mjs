import { spawnSync } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import esbuild from 'esbuild'

const outfile = path.join(tmpdir(), `literature-flow-${process.pid}.test.cjs`)

try {
	await esbuild.build({
		entryPoints: ['tests/index.test.ts'],
		bundle: true,
		format: 'cjs',
		outfile,
		platform: 'node',
	})

	const result = spawnSync(process.execPath, ['--test', outfile], {
		stdio: 'inherit',
	})
	process.exitCode = result.status ?? 1
} finally {
	await rm(outfile, { force: true })
}
