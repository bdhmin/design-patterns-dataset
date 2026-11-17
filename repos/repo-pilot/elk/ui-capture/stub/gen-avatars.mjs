// Generates avatar SVGs for every stub account with DiceBear (installed in .ui-capture/tools).
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PERSONAS } from './personas.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(here, '../tools/package.json'))
const { createAvatar } = await import(require.resolve('@dicebear/core'))
const collection = await import(require.resolve('@dicebear/collection'))
const styles = { 'notionists': collection.notionists, 'lorelei': collection.lorelei, 'personas': collection.personas, 'adventurer-neutral': collection.adventurerNeutral, 'shapes': collection.shapes }
const bgs = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'c7f0d8', 'f4e3b6', 'e3d4c0']
const out = path.join(here, 'media/avatars')
fs.mkdirSync(out, { recursive: true })
const all = [{ u: 'maren', style: 'lorelei' }, ...PERSONAS]
all.forEach((p, i) => {
  const svg = createAvatar(styles[p.style], { seed: p.u + '-hs', backgroundColor: [bgs[i % bgs.length]], radius: 0 }).toString()
  fs.writeFileSync(path.join(out, `${p.u}.svg`), svg)
})
console.log('wrote', all.length, 'avatars')
