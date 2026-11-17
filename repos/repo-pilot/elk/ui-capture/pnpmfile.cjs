// Used only for `pnpm install --pnpmfile .ui-capture/pnpmfile.cjs`.
// The capture sandbox forbids writing editor config dirs (.vscode/, .idea/)
// anywhere inside the repo, and a few published tarballs ship them.
// This importer copies package files from the store but skips those dirs.
const fs = require('node:fs')
const path = require('node:path')

const BLOCKED = /(^|\/)(\.vscode|\.idea)(\/|$)/

function importPackage(to, opts) {
  if (fs.existsSync(path.join(to, 'package.json')) && !opts.force)
    return undefined
  fs.rmSync(to, { recursive: true, force: true })
  const entries = opts.filesMap instanceof Map ? opts.filesMap.entries() : Object.entries(opts.filesMap)
  for (const [rel, src] of entries) {
    if (BLOCKED.test(rel))
      continue
    const dest = path.join(to, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
    try {
      fs.chmodSync(dest, fs.statSync(src).mode)
    }
    catch {}
  }
  return 'copy'
}

module.exports = { hooks: { importPackage } }
