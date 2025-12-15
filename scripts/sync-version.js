#!/usr/bin/env node
/**
 * Sync version from root package.json to all packages
 *
 * Usage:
 *   node scripts/sync-version.js        # Sync current version from root
 *   node scripts/sync-version.js 0.1.0  # Set and sync new version
 */
import chalk from 'chalk'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// Parse arguments
const versionArg = process.argv[2]

// Read root package.json
const rootPkgPath = join(rootDir, 'package.json')
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'))
const newVersion = versionArg || rootPkg.version

console.log(chalk.cyan.bold('\n📦 Syncing version\n'))

// Update root package.json if new version specified
if (versionArg) {
	rootPkg.version = newVersion
	writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, '\t') + '\n')
	console.log(chalk.green('✓') + ` ${chalk.bold('root')} → ${chalk.yellow(newVersion)}`)
} else {
	console.log(chalk.dim('  root:') + ` ${chalk.yellow(newVersion)} ${chalk.dim('(source)')}`)
}

// Sync to all packages
const packagesDir = join(rootDir, 'packages')
const packages = readdirSync(packagesDir, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name)

let hasChanges = !!versionArg

/**
 * Check if a dependency name is a page-agent internal package
 */
function isInternalPackage(name) {
	return name === 'page-agent' || name.startsWith('@page-agent/')
}

/**
 * Update internal package versions in dependencies object
 * @returns {boolean} Whether any changes were made
 */
function updateInternalDeps(deps, newVersion) {
	if (!deps) return false
	let changed = false
	for (const [name, version] of Object.entries(deps)) {
		if (isInternalPackage(name) && version !== newVersion) {
			deps[name] = newVersion
			changed = true
		}
	}
	return changed
}

for (const pkg of packages) {
	const pkgPath = join(packagesDir, pkg, 'package.json')
	if (!existsSync(pkgPath)) continue

	const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
	const oldVersion = pkgJson.version
	let pkgChanged = false

	// Update package version
	if (oldVersion !== newVersion) {
		pkgJson.version = newVersion
		pkgChanged = true
	}

	// Update internal dependencies (dependencies only, devDeps keep "*")
	if (updateInternalDeps(pkgJson.dependencies, newVersion)) {
		pkgChanged = true
	}

	if (!pkgChanged) {
		console.log(chalk.dim(`  ${pkgJson.name}: ${newVersion} (unchanged)`))
		continue
	}

	writeFileSync(pkgPath, JSON.stringify(pkgJson, null, '\t') + '\n')
	console.log(
		chalk.green('✓') +
			` ${chalk.bold(pkgJson.name)}: ${chalk.dim(oldVersion)} → ${chalk.yellow(newVersion)}`
	)
	hasChanges = true
}

console.log(chalk.green.bold(`\n✓ Version synced: ${newVersion}\n`))

// Show git commands hint
if (hasChanges) {
	const tagName = `v${newVersion}`
	console.log(chalk.cyan.bold('📋 Next steps:\n'))
	console.log(chalk.blueBright(`npm i`))
	console.log(
		chalk.blueBright(`git add . && git commit -m "chore(version): bump version to ${newVersion}"`)
	)
	console.log(chalk.blueBright(`git tag -a ${tagName} -m "${tagName}"`))
	console.log(chalk.blueBright(`git push && git push origin ${tagName}\n`))
}
