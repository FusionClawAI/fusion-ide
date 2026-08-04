/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import * as path from 'path';

const root = path.resolve(import.meta.dirname, '../..');

// esbuild-based bundle tasks (drop-in replacement for bundle-vscode / minify-vscode)

export function runEsbuildTranspile(outDir: string, excludeTests: boolean): Promise<void> {
	return new Promise((resolve, reject) => {
		const scriptPath = path.join(root, 'build/next/index.ts');
		// --- Start FusionIDE ---
		// Give the esbuild child a large heap. Node flags must precede the script path.
		const args = ['--max-old-space-size=8192', scriptPath, 'transpile', '--out', outDir];
		// --- End FusionIDE ---
		if (excludeTests) {
			args.push('--exclude-tests');
		}

		const proc = cp.spawn(process.execPath, args, {
			cwd: root,
			stdio: 'inherit'
		});

		proc.on('error', reject);
		proc.on('close', code => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`esbuild transpile failed with exit code ${code} (outDir: ${outDir})`));
			}
		});
	});
}

export function runEsbuildBundle(outDir: string, minify: boolean, nls: boolean, target: 'desktop' | 'server' | 'server-web' = 'desktop', sourceMapBaseUrl?: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const scriptPath = path.join(root, 'build/next/index.ts');
		// --- Start FusionIDE ---
		// Give the esbuild bundler child a large heap so NLS/mangle post-processing over the
		// multi-MB server-web bundle can't OOM (it holds the full bundle + source-map objects in
		// memory). Node flags must precede the script path.
		const args = ['--max-old-space-size=8192', scriptPath, 'bundle', '--out', outDir, '--target', target];
		// --- End FusionIDE ---
		if (minify) {
			args.push('--minify');
			args.push('--mangle-privates');
		}
		if (nls) {
			args.push('--nls');
		}
		if (sourceMapBaseUrl) {
			args.push('--source-map-base-url', sourceMapBaseUrl);
		}

		const proc = cp.spawn(process.execPath, args, {
			cwd: root,
			stdio: 'inherit'
		});

		proc.on('error', reject);
		proc.on('close', code => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`esbuild bundle failed with exit code ${code} (outDir: ${outDir}, minify: ${minify}, nls: ${nls}, target: ${target})`));
			}
		});
	});
}
