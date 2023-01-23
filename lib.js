import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'
import zlib from 'node:zlib'
import chalk from 'chalk'
import osFilterObj from 'os-filter-obj'
import StreamZip from 'node-stream-zip'
import tar from 'tar-stream'

const pkg = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url)),
)

const getLatestVersion = repoUrl =>
  execSync(
    [
      `git`,
      `-c "versionsort.suffix=-"`,
      `ls-remote`,
      `--exit-code`,
      `--refs`,
      `--sort="-version:refname"`,
      `--tags`,
      `"${repoUrl}"`,
      // `| head -1 | cut --delimiter='/' --fields=3`
      // `| grep -o 'v.*' | head -1`
      // `| grep -oP '(?<=v).*' | head -1`
    ].join(' '),
  )
    .toString()
    .trim()
    .split('\n')[0]
    .match(/v(\d+\.\d+\.\d+)/)[1]

const getDownloadUrl = (version, os, arch, ext) =>
  `https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-${version}-${os}-${arch}.${ext}`

const download = (url, dest, cb) => {
  const file = fs.createWriteStream(dest)
  https
    .get(url, response => {
      response.pipe(file)

      file.on('finish', () => {
        file.close(cb)
      })
    })
    .on('error', error => {
      fs.unlink(dest, (/* unlinkError */) => {
        // if (unlinkError && cb) cb(unlinkError)
        if (cb) cb(error)
      })
    })
}

const getConfig = () => {
  return osFilterObj([
    {
      os: 'win32',
      arch: 'x64',
      vars: ['windows', 'x64', 'zip', 'webpmux.exe'],
    },
    {
      os: 'linux',
      arch: 'x64',
      vars: ['linux', 'x86-x64', 'tar.gz', 'webpmux'],
    },
    {
      os: 'darwin',
      arch: 'x64',
      vars: ['mac', 'x86-x64', 'tar.gz', 'webpmux'],
    },
    {
      os: 'darwin',
      arch: 'arm64',
      vars: ['mac', 'arm64', 'tar.gz', 'webpmux'],
    },
  ])
}

export const install = async (version = '', verbose = true) => {
  version = version.length ? version : pkg.libwebp_version
  if (version === 'latest') {
    version = getLatestVersion(
      'https://chromium.googlesource.com/webm/libwebp',
    )
  }

  const available = getConfig()
  if (!available.length) {
    console.log(`  ${chalk.red('✘')} Could not find supporting ${chalk.cyan('libwebp')} version:`)
    throw new Error('No binary available for this platform.')
  }
  const [os, arch, archiveExt, bin] = available[0].vars

  const dest = fileURLToPath(new URL('./vendor', import.meta.url))
  const toFilePath = `${dest}/${bin}`

  let setPermissions = false
  let foundBinary = false

  // Skip if version is different from shipped binaries
  if (version === pkg.libwebp_version) {
    // Look for prepared binary
    const stats = fs.lstatSync(toFilePath, { throwIfNoEntry: false })
    if (stats) {
      if (stats.isSymbolicLink() || stats.isDirectory()) {
        console.log(`  ${chalk.red('✘')} Could not prepare ${chalk.cyan('libwebp')}:`)
        throw new Error('Destination path for binary exists, but is not a file.')
      } else {
        verbose && console.log(`  ${chalk.green('✔')} Found ${chalk.cyan('webpmux')} binary`)
        foundBinary = true
      }
    }

    // Look for shipped binary
    if (!foundBinary) {
      const localFromFilePath = `${dest}/${os}/${arch}/${bin}`
      const stats2 = fs.lstatSync(localFromFilePath, { throwIfNoEntry: false })
      if (stats2 && !stats2.isSymbolicLink() && !stats2.isDirectory()) {
        // // Prepare destination directory
        // fs.mkdirSync(dest, { recursive: true, mode: 0o755 })

        // Copy binary
        await new Promise((resolve, reject) => {
          fs.copyFile(localFromFilePath, toFilePath, (error) => {
            if (error) reject(error)
            resolve()
          })
        }).catch(( /* error */ ) => {
          verbose && console.log(`  ${chalk.yellow('✘')} Could not copy shipped ${chalk.cyan('webpmux')} binary. Trying download...`)
          // throw error
        }).then(() => {
          verbose && console.log(`  ${chalk.green('✔')} Copied shipped ${chalk.cyan('webpmux')} binary`)
          foundBinary = true
          setPermissions = true
        })
      }
    }
  }

  // Download binary
  if (!foundBinary) {
    const downloadUrl = getDownloadUrl(version, os, arch, archiveExt)
    const archivePath = `${dest}/libwebp.${archiveExt}`
    const fromFilePath = `libwebp-${version}-${os}-${arch}/bin/${bin}`

    // // Prepare destination directory
    // fs.mkdirSync(dest, { recursive: true, mode: 0o755 })

    // Download archive
    await new Promise((resolve, reject) => {
      download(downloadUrl, archivePath, async error => {
        if (error) reject(error)
        resolve()
      })
    }).catch(error => {
      console.log(`  ${chalk.red('✘')} Could not download ${chalk.cyan('libwebp')} ${chalk.magenta(version)} archive:`)
      throw error
    })
    verbose && console.log(`  ${chalk.green('✔')} Downloaded ${chalk.cyan('libwebp')} ${chalk.magenta(version)} archive`)

    // Extract binary from archive
    await new Promise((resolve, reject) => {
      if ('zip' === archiveExt) {
        // .zip
        const zip = new StreamZip({ file: archivePath })

        zip.on('error', error => reject(error))

        zip.on('ready', () => {
          zip.extract(fromFilePath, toFilePath, error => {
            if (error) reject(error)
            zip.close() // TODO: takes callback ??
            resolve()
          })
        })
      } else {
        // .tar.gz
        const extract = tar.extract()
        const chunks = []

        extract.on('entry', (header, stream, next) => {
          if (header.type === 'file' && header.name == fromFilePath) {
            stream.on('data', chunk => {
              chunks.push(chunk)
            })
          }

          stream.on('end', () => {
            next()
          })

          stream.resume()
        })

        extract.on('finish', () => {
          if (chunks.length) {
            const data = Buffer.concat(chunks)
            fs.writeFile(toFilePath, data, () => {
              resolve()
            })
          }
        })

        extract.on('error', error => {
          reject(error)
        })

        fs.createReadStream(archivePath).pipe(zlib.createGunzip()).pipe(extract)
      }
    }).catch(error => {
      console.log(`  ${chalk.red('✘')} Could not extract ${chalk.cyan('webpmux')} binary from archive:`)
      throw error
    })
    verbose && console.log(`  ${chalk.green('✔')} Extracted ${chalk.cyan('webpmux')} binary from archive`)
    setPermissions = true

    // Clean up archive
    fs.rmSync(archivePath, { force: true })
  }

  // Set execution permission
  if (setPermissions) {
    await new Promise((resolve, reject) => {
      fs.chmod(toFilePath, 0o755, (error) => {
        if (error) reject(error)
        resolve()
      })
    }).catch((error) => {
      console.log(`  ${chalk.red('✘')} Could not set execute permission on local ${chalk.cyan('libwebp')} binary.`)
      throw error
    })
    verbose && console.log(`  ${chalk.green('✔')} Execute permission set for ${chalk.cyan('webpmux')} binary`)
  }

  return toFilePath
}

const webpmuxBin = () => {
  const available = getConfig()
  if (!available.length) {
    console.log(`  ${chalk.red('✘')} Could not find supporting ${chalk.cyan('libwebp')} version:`)
    throw new Error('No binary available for this platform.')
  }
  const [os, arch, archiveExt, bin] = available[0].vars

  const dest = fileURLToPath(new URL('./vendor', import.meta.url))
  const toFilePath = `${dest}/${bin}`

  return toFilePath
}

export default webpmuxBin
