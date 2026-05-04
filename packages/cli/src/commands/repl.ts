/**
 * REPL (interactive) mode for the page-agent CLI.
 *
 * Prints a banner, then presents a readline prompt. Each line is parsed
 * as a space-separated argv array and dispatched back through Commander,
 * reusing the existing command tree. Special built-ins: `help`, `exit`.
 */
import chalk from 'chalk'
import { createInterface } from 'node:readline'

const BANNER = `
${chalk.bold.cyan('page-agent')} ${chalk.dim('cli')}  ${chalk.dim('──  interactive mode')}
${chalk.dim('Type a command (e.g. state, click 3, run "open google") or exit / help.')}
`

const PROMPT = chalk.cyan('pa> ')

/**
 * Start the interactive REPL.
 * @param dispatch - function that runs a command from an argv string array.
 */
export async function startRepl(dispatch: (argv: string[]) => Promise<void>): Promise<void> {
	process.stderr.write(BANNER)

	const rl = createInterface({
		input: process.stdin,
		output: process.stderr,
		terminal: true,
		prompt: PROMPT,
	})

	rl.prompt()

	for await (const line of rl) {
		const trimmed = line.trim()

		if (!trimmed) {
			rl.prompt()
			continue
		}

		if (trimmed === 'exit' || trimmed === 'quit' || trimmed === 'q') {
			process.stderr.write(chalk.dim('bye\n'))
			rl.close()
			return
		}

		if (trimmed === 'help' || trimmed === '?') {
			await dispatch(['--help']).catch(() => {})
			rl.prompt()
			continue
		}

		// Parse the line into argv parts, handling quoted strings
		const argv = parseArgv(trimmed)

		try {
			await dispatch(argv)
		} catch {
			// Errors already printed by the command handlers
		}

		rl.prompt()
	}
}

/**
 * Minimal shell-style argument parser.
 * Handles single quotes, double quotes, and backslash escaping.
 */
function parseArgv(line: string): string[] {
	const args: string[] = []
	let current = ''
	let inSingle = false
	let inDouble = false
	let escaped = false

	for (const ch of line) {
		if (escaped) {
			current += ch
			escaped = false
			continue
		}

		if (ch === '\\' && !inSingle) {
			escaped = true
			continue
		}

		if (ch === "'" && !inDouble) {
			inSingle = !inSingle
			continue
		}

		if (ch === '"' && !inSingle) {
			inDouble = !inDouble
			continue
		}

		if (ch === ' ' && !inSingle && !inDouble) {
			if (current) {
				args.push(current)
				current = ''
			}
			continue
		}

		current += ch
	}

	if (current) args.push(current)
	return args
}
