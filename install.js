import fs from 'node:fs'
import chalk from 'chalk'
import { execa } from 'execa'
import { install } from './lib.js'

let version = ''

// const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)))
// version = pkg.libwebp_version

// If not global install, check for libwebp_version in dependent's package.json
if (!process.env.npm_config_global) {
  const packagePath = `${process.cwd()}/package.json`
  if (fs.existsSync(packagePath)) {
    const parentPkg = JSON.parse(fs.readFileSync(packagePath))
    if (parentPkg?.libwebp_version) {
      version = parentPkg.libwebp_version
      console.log(`  ${chalk.green('✔')} Installing using ${chalk.cyan('libwebp')} ${chalk.magenta(version)}`)
    }
  }
}

const { stdout, stderr } = await execa(await install(version), ['-version'])
if (stderr.length) {
  console.warn(`  ${chalk.red('✘')} ${chalk.cyan('webpmux')} pre-build test failed:`)
  console.warn(stderr)
} else {
	console.log(`  ${chalk.green('✔')} ${chalk.cyan('webpmux')} ${chalk.magenta(stdout)} pre-build test passed successfully`)
}
