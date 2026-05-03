import type { Command } from 'commander'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { getPageController } from '../context.js'
import { die, printSuccess } from '../output.js'

function isWindowsAbsolutePath(path: string): boolean {
	return /^[a-zA-Z]:[\\/]/.test(path)
}

function toWindowsPathForBrowser(path: string): string {
	// Keep valid Windows absolute path as-is (normalize separators only).
	if (isWindowsAbsolutePath(path)) {
		return path.replace(/\//g, '\\')
	}

	// WSL caller + Windows browser (common setup):
	// convert "/mnt/c/Users/..." -> "C:\\Users\\..."
	const m = /^\/mnt\/([a-zA-Z])\/(.*)$/.exec(path)
	if (m) {
		const drive = m[1]!.toUpperCase()
		const rest = m[2]!.replace(/\//g, '\\')
		return `${drive}:\\${rest}`
	}

	return path
}

function toLocalPathForExistenceCheck(inputPath: string): string {
	// In WSL, "C:\\foo\\bar" is not directly readable by existsSync.
	// Map it to "/mnt/c/foo/bar" for local existence check.
	if (
		process.platform === 'linux' &&
		process.env.WSL_DISTRO_NAME &&
		isWindowsAbsolutePath(inputPath)
	) {
		const drive = inputPath[0]!.toLowerCase()
		const rest = inputPath.slice(2).replace(/\\/g, '/').replace(/^\/+/, '')
		return `/mnt/${drive}/${rest}`
	}
	return inputPath
}

export function registerUpload(program: Command): void {
	program
		.command('upload <index> <files...>')
		.description('Set local file(s) on a <input type="file"> element by index.')
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent-cli --json state                          # observe → find file input index
  $ page-agent-cli --json upload 5 /path/to/photo.jpg   # single file
  $ page-agent-cli --json upload 5 img1.png img2.png     # multiple files (relative paths OK)

Notes:
  The element at <index> must be an <input type="file">. The index must match
  the Page Agent flat tree (same numbering as \`state\`). Many sites omit file
  inputs from \`state\` until you locate/prepare them in the DOM (often via
  \`eval\` and/or UI clicks), then refresh \`state\` to read the correct index.
  Relative paths are resolved against the current working directory.

  The browser fires the normal change/input events after injection, so upload
  handlers trigger exactly as if the user had used the system file picker.`
		)
		.action(async (indexStr: string, files: string[]) => {
			const index = parseInt(indexStr, 10)
			if (isNaN(index) || index < 0) die(`Invalid index: ${indexStr}`)

			// Resolve to absolute paths and validate existence.
			const resolvedPaths: string[] = []
			for (const f of files) {
				// Important: don't call resolve() on Windows absolute paths in WSL;
				// it would produce "/cwd/C:\\..." and break both existence checks
				// and browser injection paths.
				const candidate = isWindowsAbsolutePath(f) ? f : resolve(f)
				const localPath = toLocalPathForExistenceCheck(candidate)
				if (!existsSync(localPath)) {
					die(`File not found: ${candidate}`)
				}
				resolvedPaths.push(toWindowsPathForBrowser(candidate))
			}

			try {
				const pc = await getPageController()
				const result = await pc.uploadFiles(index, resolvedPaths)
				if (!result.success) die(result.message)
				printSuccess(result.message)
			} catch (err) {
				die(err)
			}
		})
}
