import crypto from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { access, readFile, unlink } from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'

const TEST_FILES = {
  'AudioVideoInterleave.avi': {
    url: 'https://github.com/mathiasbynens/small/raw/master/AudioVideoInterleave.avi',
    md5: 'a51c3aff106210abcf32a9d4285628a6',
  },
  'Dead_Combo_-_01_-_Povo_Que_Cas_Descalo.mp3': {
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Creative_Commons/Dead_Combo/CC_Affiliates_Mixtape_1/Dead_Combo_-_01_-_Povo_Que_Cas_Descalo.mp3',
    md5: 'b02fc030703403a13c9a6cef5922c6d1',
  },
  // Vendored in the repo (committed). The previous download source
  // (dwsamplefiles.com) is dead and the exact original file is no longer
  // available anywhere, so the canonical file-examples.com sample is checked
  // in instead. `url: undefined` => never downloaded, just md5-verified.
  'file_example_MP4_480_1_5MG.mp4': {
    url: undefined,
    md5: 'd9061d3da8601932e98f79ec8ba1c877',
  },
  'many_tracks.mp4': {
    url: undefined,
    md5: '0e002574aad79365477ab8f904fef616',
  },
  'sample.mkv': {
    url: 'https://github.com/sbraz/pymediainfo/raw/master/tests/data/sample.mkv',
    md5: '130830537d5b0b79e78d68be16dde0fd',
  },
}

function downloadFile(url: string, filePath: string) {
  return new Promise<void>((resolve, reject) => {
    https
      .get(url, (res) => {
        const code = res.statusCode ?? 0

        // handle redirects
        if (code > 300 && code < 400 && !!res.headers.location) {
          res.resume()
          resolve(downloadFile(res.headers.location, filePath))
          return
        }

        // anything other than a successful response is an error: do not write
        // an error page (e.g. HTML) to disk and let it masquerade as a fixture
        if (code !== 200) {
          res.resume()
          reject(new Error(`Failed to download ${url}: HTTP ${code}`))
          return
        }

        const fileStream = createWriteStream(filePath)
          .on('finish', () => {
            resolve()
          })
          .on('error', (err) => {
            reject(err)
          })

        res.pipe(fileStream)
      })
      .on('error', reject)
  })
}

async function md5OfFile(filePath: string) {
  const content = await readFile(filePath)
  return crypto.createHash('md5').update(content).digest('hex')
}

async function downloadFixtures() {
  for (const [fileName, { url, md5 }] of Object.entries(TEST_FILES)) {
    const filePath = path.resolve(import.meta.dirname, '..', 'fixtures', fileName)

    // Use the existing file only if it matches the expected hash. This way a
    // previously-corrupt download (or stale cache) is re-fetched rather than
    // trusted, instead of failing the whole run on a poisoned fixture.
    try {
      await access(filePath)
      if ((await md5OfFile(filePath)) === md5) {
        continue
      }
    } catch {
      // file missing - fall through to download
    }

    if (!url) {
      throw new Error(
        `Fixture "${fileName}" is missing or corrupt and has no download URL. ` +
          `It is expected to be committed to __tests__/fixtures.`
      )
    }

    await downloadFile(url, filePath)

    const hash = await md5OfFile(filePath)
    if (hash !== md5) {
      // remove the bad file so the next run does not reuse it
      await unlink(filePath).catch(() => {})
      throw new Error(
        `File ${fileName} has md5 mismatch (expected ${md5}, got ${hash}). ` +
          `The download source may have changed.`
      )
    }
  }
}

export default downloadFixtures
