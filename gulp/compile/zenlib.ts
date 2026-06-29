import path from 'node:path'

import { CPU_CORES, CXXFLAGS, VENDOR_DIR } from '../constants.ts'
import { spawn } from '../utils.ts'

const zenlibDir = path.join(VENDOR_DIR, 'ZenLib', 'Project', 'GNU', 'Library')

async function task() {
  await spawn('./autogen.sh', [], zenlibDir)
  await spawn('sed', ['-i', '', 's/-O2/-Oz/', 'configure'], zenlibDir)
  await spawn(
    'emconfigure',
    [
      './configure',
      '--host=le32-unknown-nacl',
      // Build ZenLib in Unicode (wide) mode. The char-based (UTF-8) build path
      // mangles non-Latin-1 characters in MediaInfoLib 26.05 output; the wide
      // path is unaffected (we convert wide -> UTF-8 ourselves in inform()).
      '--enable-unicode',
      '--enable-static',
      '--disable-shared',
      `CXXFLAGS=${CXXFLAGS}`,
    ],
    zenlibDir
  )
  await spawn('emmake', ['make', `-j${CPU_CORES}`], zenlibDir)
}

task.displayName = 'compile:zenlib'
task.description = 'Compile zenlib'

export default task
