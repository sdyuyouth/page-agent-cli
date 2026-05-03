/**
 * Unified output helpers for page-agent-cli.
 *
 * In --json mode all results go to stdout as structured JSON.
 * In human mode results are colorful text, also on stdout.
 * Errors always go to stderr regardless of mode.
 */
import chalk from 'chalk'

export interface JsonOutput {
	success: boolean
	data?: unknown
	error?: string
}

/** Global flag set by the CLI entry before any command runs. */
export let jsonMode = false

export function setJsonMode(value: boolean): void {
	jsonMode = value
}

// ---------------------------------------------------------------------------
// Success output
// ---------------------------------------------------------------------------

/** Emit a successful result. data may be any JSON-serializable value. */
export function printSuccess(data: unknown): void {
	if (jsonMode) {
		process.stdout.write(JSON.stringify({ success: true, data }, null, 2) + '\n')
	} else {
		if (typeof data === 'string') {
			process.stdout.write(chalk.green('✅ ') + data + '\n')
		} else {
			process.stdout.write(chalk.green('✅ ') + JSON.stringify(data, null, 2) + '\n')
		}
	}
}

// ---------------------------------------------------------------------------
// Error output
// ---------------------------------------------------------------------------

/** Emit an error. Always writes to stderr. In --json mode also writes JSON to stdout. */
export function printError(error: unknown): void {
	const msg = error instanceof Error ? error.message : String(error)

	if (jsonMode) {
		process.stdout.write(JSON.stringify({ success: false, error: msg }, null, 2) + '\n')
	}

	process.stderr.write(chalk.red('❌ ') + msg + '\n')
}

// ---------------------------------------------------------------------------
// Informational (non-result) output — suppressed in --json mode
// ---------------------------------------------------------------------------

export function printInfo(msg: string): void {
	if (!jsonMode) {
		process.stderr.write(chalk.cyan(msg) + '\n')
	}
}

export function printDim(msg: string): void {
	if (!jsonMode) {
		process.stderr.write(chalk.dim(msg) + '\n')
	}
}

// ---------------------------------------------------------------------------
// Exit helpers
// ---------------------------------------------------------------------------

/** Print error and exit with code 1. */
export function die(error: unknown): never {
	printError(error)
	process.exit(1)
}
