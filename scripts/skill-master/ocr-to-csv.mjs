import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const DEFAULT_IMAGE_ROOT = './scripts/skill-master/source-images'
const DEFAULT_OUTPUT = './scripts/skill-master/skill-master.ocr.csv'
const DEFAULT_LANGUAGE = 'jpn+eng'
const DEFAULT_PSMS = [6, 11]
const DEFAULT_CONCURRENCY = 2
const STRUCTURED_OCR_PSM = 11
const TITLE_CROP_RATIOS = { left: 0, top: 0, right: 1, bottom: 0.24 }
const RARITY_REGION_RATIOS = { left: 0.62, top: 0.08, right: 0.88, bottom: 0.26 }
const ATTR_REGION_RATIOS = { left: 0.7, top: 0.3, right: 0.97, bottom: 0.88 }
const IMAGE_REGION_TOOL = path.resolve(
  process.cwd(),
  'scripts/skill-master/image-region-tools.py'
)
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
  '.avif',
])

const usage = `Usage:
  npm run skill-master:ocr -- --folder sword
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run skill-master:ocr -- --folder sword --upload-images
  npm run skill-master:ocr -- --input-dir ./scripts/skill-master/source-images/sword
  npm run skill-master:ocr -- --input-dir ./scripts/skill-master/source-images --output ./scripts/skill-master/skill-master.ocr.csv
  npm run skill-master:ocr -- --input-dir ./scripts/skill-master/source-images/sword --limit 10 --debug-json ./tmp/skill-master.ocr.debug.json

Options:
  --folder <name>         Optional. Folder name directly under ${DEFAULT_IMAGE_ROOT}
  --input-dir <path>      Optional. Directory to scan. Default: ${DEFAULT_IMAGE_ROOT}
  --image-root <path>     Optional. Root used to build the CSV image relative path. Default: ${DEFAULT_IMAGE_ROOT}
  --output <path>         Optional. CSV output path. Default: ${DEFAULT_OUTPUT}
  --debug-json <path>     Optional. Write OCR debug details as JSON.
  --upload-images         Optional. Upload source images to Storage and write download URLs into image.
  --lang <value>          Optional. Tesseract languages. Default: ${DEFAULT_LANGUAGE}
  --psm <list>            Optional. Comma-separated Tesseract PSM list. Default: ${DEFAULT_PSMS.join(',')}
  --concurrency <number>  Optional. Parallel OCR workers. Default: ${DEFAULT_CONCURRENCY}
  --limit <number>        Optional. Process only the first N images.
  --help                  Show this help.
`

const canonicalAttributes = ['火', '水', '土', '聖', '闇', '風', '無']
const attributeSlugMap = {
  火: 'fire',
  水: 'water',
  土: 'earth',
  聖: 'holy',
  闇: 'dark',
  風: 'wind',
  無: 'none',
}
const attributeAliases = new Map([
  ['火', '火'],
  ['fire', '火'],
  ['炎', '火'],
  ['red', '火'],
  ['水', '水'],
  ['water', '水'],
  ['blue', '水'],
  ['土', '土'],
  ['earth', '土'],
  ['brown', '土'],
  ['聖', '聖'],
  ['holy', '聖'],
  ['light', '聖'],
  ['yellow', '聖'],
  ['闇', '闇'],
  ['dark', '闇'],
  ['shadow', '闇'],
  ['purple', '闇'],
  ['風', '風'],
  ['wind', '風'],
  ['green', '風'],
  ['air', '風'],
  ['無', '無'],
  ['none', '無'],
  ['neutral', '無'],
  ['colorless', '無'],
])

const weaponBases = ['片手直剣', '細剣', '棍棒', '短剣', '斧', '槍', '弓', '盾']
const weaponBaseAliases = new Map([
  ['片手直剣', '片手直剣'],
  ['片手剣', '片手直剣'],
  ['直剣', '片手直剣'],
  ['剣', '片手直剣'],
  ['sword', '片手直剣'],
  ['細剣', '細剣'],
  ['レイピア', '細剣'],
  ['rapier', '細剣'],
  ['棍棒', '棍棒'],
  ['棍', '棍棒'],
  ['club', '棍棒'],
  ['mace', '棍棒'],
  ['短剣', '短剣'],
  ['dagger', '短剣'],
  ['ナイフ', '短剣'],
  ['斧', '斧'],
  ['axe', '斧'],
  ['槍', '槍'],
  ['spear', '槍'],
  ['lance', '槍'],
  ['弓', '弓'],
  ['bow', '弓'],
  ['盾', '盾'],
  ['shield', '盾'],
  ['アビリティ', 'アビリティ'],
  ['ability', 'アビリティ'],
  ['バースト/フルバースト', 'バースト/フルバースト'],
  ['burst/fullburst', 'バースト/フルバースト'],
  ['burstfullburst', 'バースト/フルバースト'],
  ['フリー', 'フリー'],
  ['free', 'フリー'],
])
const weaponVariantAliases = new Map([
  ['覚醒', '覚醒'],
  ['awaken', '覚醒'],
  ['recollection', '覚醒'],
  ['アクセル', 'アクセル'],
  ['accele', 'アクセル'],
  ['mod', 'MOD'],
  ['コネクト', 'コネクト'],
  ['connect', 'コネクト'],
  ['チェイン', 'チェイン'],
  ['chain', 'チェイン'],
  ['リンク', 'リンク'],
  ['link', 'リンク'],
])
const baseTypeSlugMap = {
  片手直剣: 'sword',
  細剣: 'rapier',
  棍棒: 'club',
  短剣: 'dagger',
  斧: 'axe',
  槍: 'spear',
  弓: 'bow',
  盾: 'shield',
  アビリティ: 'ability',
  'バースト/フルバースト': 'burst-fullburst',
  フリー: 'free',
}
const variantTypeSlugMap = {
  覚醒: 'awaken',
  アクセル: 'accele',
  MOD: 'mod',
  コネクト: 'connect',
  チェイン: 'chain',
  リンク: 'link',
}
const skillTypeAliases = new Map([
  ['', '通常'],
  ['base', '通常'],
  ['normal', '通常'],
  ['通常', '通常'],
  ['覚醒', '覚醒'],
  ['覚醒レベル', '覚醒'],
  ['awaken', '覚醒'],
  ['recollection', '覚醒'],
  ['アクセル', 'アクセル'],
  ['アクセルスキル', 'アクセル'],
  ['accele', 'アクセル'],
  ['mod', 'MOD'],
  ['modslot', 'MOD'],
  ['mod slot', 'MOD'],
  ['コネクト', 'コネクト'],
  ['connect', 'コネクト'],
  ['connectskill', 'コネクト'],
  ['connect skill', 'コネクト'],
  ['connectslot', 'コネクト'],
  ['connect slot', 'コネクト'],
  ['チェイン', 'チェイン'],
  ['chain', 'チェイン'],
  ['chainskill', 'チェイン'],
  ['chain skill', 'チェイン'],
  ['チェインスキル', 'チェイン'],
  ['リンク', 'リンク'],
  ['link', 'リンク'],
  ['burst', 'バースト'],
  ['バースト', 'バースト'],
  ['バーストスキル', 'バースト'],
  ['fullburst', 'フルバースト'],
  ['full burst', 'フルバースト'],
  ['フルバースト', 'フルバースト'],
  ['フルバーストスキル', 'フルバースト'],
])
const attackTypeAliases = new Map([
  ['斬', '斬'],
  ['slash', '斬'],
  ['突', '突'],
  ['pierce', '突'],
  ['打', '打'],
  ['strike', '打'],
])
const folderTypeAliases = new Map([
  ['sword', '片手直剣'],
  ['rapier', '細剣'],
  ['club', '棍棒'],
  ['dagger', '短剣'],
  ['axe', '斧'],
  ['spear', '槍'],
  ['bow', '弓'],
  ['shield', '盾'],
  ['ability', 'アビリティ'],
  ['burst', 'バースト/フルバースト'],
  ['free', 'フリー'],
])

function inferTypeFromFolderName(folderName) {
  const normalizedFolderName = normalizeWhitespace(folderName).toLowerCase()
  for (const [alias, canonical] of folderTypeAliases.entries()) {
    if (
      normalizedFolderName === alias ||
      normalizedFolderName.startsWith(`${alias}-`) ||
      normalizedFolderName.endsWith(`-${alias}`)
    ) {
      return canonical
    }
  }
  return ''
}

function parseArgs(argv) {
  const args = {
    folder: '',
    inputDir: DEFAULT_IMAGE_ROOT,
    imageRoot: DEFAULT_IMAGE_ROOT,
    output: DEFAULT_OUTPUT,
    debugJson: '',
    uploadImages: false,
    lang: DEFAULT_LANGUAGE,
    psms: DEFAULT_PSMS,
    concurrency: DEFAULT_CONCURRENCY,
    limit: 0,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--folder') {
      args.folder = normalizeWhitespace(argv[index + 1] || '')
      index += 1
      continue
    }
    if (arg === '--input-dir') {
      args.inputDir = argv[index + 1] || args.inputDir
      index += 1
      continue
    }
    if (arg === '--image-root') {
      args.imageRoot = argv[index + 1] || args.imageRoot
      index += 1
      continue
    }
    if (arg === '--output') {
      args.output = argv[index + 1] || args.output
      index += 1
      continue
    }
    if (arg === '--debug-json') {
      args.debugJson = argv[index + 1] || ''
      index += 1
      continue
    }
    if (arg === '--upload-images') {
      args.uploadImages = true
      continue
    }
    if (arg === '--lang') {
      args.lang = argv[index + 1] || args.lang
      index += 1
      continue
    }
    if (arg === '--psm') {
      const value = argv[index + 1] || ''
      args.psms = value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item >= 0)
      index += 1
      continue
    }
    if (arg === '--concurrency') {
      args.concurrency = Number(argv[index + 1] || String(DEFAULT_CONCURRENCY))
      index += 1
      continue
    }
    if (arg === '--limit') {
      args.limit = Number(argv[index + 1] || '0')
      index += 1
      continue
    }
    if (arg === '--help' || arg === '-h') {
      args.help = true
    }
  }

  return args
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeOcrTextBlock(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .join('\n')
}

function normalizeLookupKey(value) {
  return normalizeWhitespace(value).toLowerCase().replace(/[\s_()/:.-]/g, '')
}

function sanitizeOutputFragment(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resolveRuntimePaths(args) {
  const imageRoot = path.resolve(process.cwd(), args.imageRoot)
  const folderName = normalizeWhitespace(args.folder)
  const inputDir = folderName
    ? path.resolve(imageRoot, folderName)
    : path.resolve(process.cwd(), args.inputDir)
  const safeFolderFragment = sanitizeOutputFragment(folderName)
  const outputPath =
    args.output !== DEFAULT_OUTPUT
      ? path.resolve(process.cwd(), args.output)
      : folderName
        ? path.resolve(process.cwd(), 'tmp', `skill-master.ocr.${safeFolderFragment}.csv`)
        : path.resolve(process.cwd(), args.output)
  const debugJsonPath = args.debugJson
    ? path.resolve(process.cwd(), args.debugJson)
    : folderName
      ? path.resolve(process.cwd(), 'tmp', `skill-master.ocr.${safeFolderFragment}.json`)
      : ''

  return {
    folderName,
    imageRoot,
    inputDir,
    outputPath,
    debugJsonPath,
  }
}

function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

async function walkImages(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkImages(absolutePath)))
      continue
    }
    if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolutePath)
    }
  }
  return files.sort((a, b) => a.localeCompare(b))
}

async function readFileHead(filePath, length = 256) {
  const file = await fs.open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(length)
    const { bytesRead } = await file.read(buffer, 0, length, 0)
    return buffer.subarray(0, bytesRead).toString('utf8')
  } finally {
    await file.close()
  }
}

async function isGitLfsPointerFile(filePath) {
  const head = await readFileHead(filePath)
  return head.startsWith('version https://git-lfs.github.com/spec/v1')
}

async function ensureTesseractAvailable() {
  try {
    await execFileAsync('tesseract', ['--version'])
  } catch {
    throw new Error('tesseract command not found. Please install Tesseract OCR first.')
  }
}

async function cropImageByRatio(filePath, ratios) {
  const cropDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-master-ocr-crop-'))
  const cropPath = path.join(cropDirectory, `${path.basename(filePath)}.crop.png`)
  try {
    await execFileAsync('python3', [
      IMAGE_REGION_TOOL,
      'crop',
      '--src',
      filePath,
      '--dst',
      cropPath,
      '--left-ratio',
      String(ratios.left),
      '--top-ratio',
      String(ratios.top),
      '--right-ratio',
      String(ratios.right),
      '--bottom-ratio',
      String(ratios.bottom),
    ])
    return {
      cropPath,
      async cleanup() {
        await fs.rm(cropDirectory, { recursive: true, force: true })
      },
    }
  } catch (error) {
    await fs.rm(cropDirectory, { recursive: true, force: true })
    throw error
  }
}

async function detectDominantColorByRatio(filePath, ratios) {
  try {
    const { stdout } = await execFileAsync('python3', [
      IMAGE_REGION_TOOL,
      'dominant-color',
      '--src',
      filePath,
      '--left-ratio',
      String(ratios.left),
      '--top-ratio',
      String(ratios.top),
      '--right-ratio',
      String(ratios.right),
      '--bottom-ratio',
      String(ratios.bottom),
    ])
    const parsed = JSON.parse(stdout || '{}')
    return parsed?.found ? parsed : null
  } catch {
    return null
  }
}

async function runTesseract(filePath, lang, psm) {
  const { stdout } = await execFileAsync('tesseract', [
    filePath,
    'stdout',
    '-l',
    lang,
    '--psm',
    String(psm),
  ])
  return normalizeOcrTextBlock(stdout)
}

async function runOcrPasses(filePath, lang, psms) {
  const texts = []
  for (const psm of psms) {
    const text = await runTesseract(filePath, lang, psm)
    if (text) texts.push(text)
  }
  const seen = new Set()
  const lines = texts
    .flatMap((text) => text.split('\n'))
    .map((line) => normalizeWhitespace(line))
    .filter((line) => {
      if (!line) return false
      if (seen.has(line)) return false
      seen.add(line)
      return true
    })
  return {
    combinedText: lines.join('\n'),
    lines,
  }
}

async function runTitleCropOcr(filePath, lang) {
  let crop = null
  try {
    crop = await cropImageByRatio(filePath, TITLE_CROP_RATIOS)
    const texts = []
    for (const psm of [11, 6]) {
      const text = await runTesseract(crop.cropPath, lang, psm)
      if (text) texts.push(text)
    }
    const seen = new Set()
    return texts
      .flatMap((text) => text.split('\n'))
      .map((line) => normalizeWhitespace(line))
      .filter((line) => {
        if (!line) return false
        if (seen.has(line)) return false
        seen.add(line)
        return true
      })
  } catch {
    return []
  } finally {
    if (crop) await crop.cleanup()
  }
}

function containsJapaneseText(value) {
  return /[一-龥ぁ-んァ-ヶ]/.test(String(value ?? ''))
}

function shouldInsertSpaceBetweenTokens(left, right) {
  if (!left || !right) return false
  if (/[【「『（(]$/u.test(left)) return false
  if (/^[】」』）)、。・:：%)]/u.test(right)) return false
  if (containsJapaneseText(left) || containsJapaneseText(right)) return false
  return true
}

function buildStructuredLineText(words) {
  return words
    .sort((left, right) => left.left - right.left)
    .reduce((result, word, index) => {
      if (index === 0) return word.text
      return `${result}${shouldInsertSpaceBetweenTokens(words[index - 1].text, word.text) ? ' ' : ''}${word.text}`
    }, '')
}

function parseTesseractTsv(tsvText) {
  const rows = String(tsvText ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .filter(Boolean)
  if (rows.length === 0) {
    return { imageSize: { width: 0, height: 0 }, lineBoxes: [] }
  }

  const headers = rows[0].split('\t')
  const getIndex = (name) => headers.indexOf(name)
  const lineGroups = new Map()
  let imageWidth = 0
  let imageHeight = 0

  rows.slice(1).forEach((row) => {
    const columns = row.split('\t')
    if (columns.length < headers.length) return
    const level = Number.parseInt(columns[getIndex('level')] ?? '', 10)
    if (level === 1) {
      imageWidth = Number.parseInt(columns[getIndex('width')] ?? '0', 10) || imageWidth
      imageHeight = Number.parseInt(columns[getIndex('height')] ?? '0', 10) || imageHeight
      return
    }
    const text = normalizeWhitespace(columns[getIndex('text')] ?? '')
    if (!text) return
    const key = [
      columns[getIndex('page_num')],
      columns[getIndex('block_num')],
      columns[getIndex('par_num')],
      columns[getIndex('line_num')],
    ].join(':')
    const word = {
      text,
      left: Number.parseInt(columns[getIndex('left')] ?? '0', 10) || 0,
      top: Number.parseInt(columns[getIndex('top')] ?? '0', 10) || 0,
      width: Number.parseInt(columns[getIndex('width')] ?? '0', 10) || 0,
      height: Number.parseInt(columns[getIndex('height')] ?? '0', 10) || 0,
      conf: Number.parseFloat(columns[getIndex('conf')] ?? '0') || 0,
    }
    const existing = lineGroups.get(key) ?? []
    existing.push(word)
    lineGroups.set(key, existing)
  })

  const lineBoxes = Array.from(lineGroups.values())
    .map((words) => {
      const sortedWords = [...words].sort((left, right) => left.left - right.left)
      const left = Math.min(...sortedWords.map((word) => word.left))
      const top = Math.min(...sortedWords.map((word) => word.top))
      const right = Math.max(...sortedWords.map((word) => word.left + word.width))
      const bottom = Math.max(...sortedWords.map((word) => word.top + word.height))
      return {
        text: normalizeWhitespace(buildStructuredLineText(sortedWords)),
        words: sortedWords,
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
      }
    })
    .sort((left, right) => left.top - right.top || left.left - right.left)

  return {
    imageSize: { width: imageWidth, height: imageHeight },
    lineBoxes,
  }
}

async function runStructuredOcr(filePath, lang, psm = STRUCTURED_OCR_PSM) {
  const { stdout } = await execFileAsync('tesseract', [
    filePath,
    'stdout',
    '-l',
    lang,
    '--psm',
    String(psm),
    'tsv',
  ])
  return parseTesseractTsv(stdout)
}

async function detectRarityStarCount(filePath) {
  try {
    const { stdout } = await execFileAsync('python3', [
      IMAGE_REGION_TOOL,
      'count-stars',
      '--src',
      filePath,
      '--left-ratio',
      String(RARITY_REGION_RATIOS.left),
      '--top-ratio',
      String(RARITY_REGION_RATIOS.top),
      '--right-ratio',
      String(RARITY_REGION_RATIOS.right),
      '--bottom-ratio',
      String(RARITY_REGION_RATIOS.bottom),
    ])
    const parsed = JSON.parse(stdout || '{}')
    const count = Number.parseInt(String(parsed?.count ?? ''), 10)
    return Number.isInteger(count) && count > 0 ? String(count) : ''
  } catch {
    return ''
  }
}

function normalizeIntegerString(
  value,
  { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, keepPlus = false } = {}
) {
  const match = String(value ?? '')
    .replace(/,/g, '')
    .match(/[+-]?\d+(?:\.\d+)?/)
  if (!match) return ''
  const parsed = Math.trunc(Number(match[0]))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return ''
  if (keepPlus && /^\s*\+/.test(String(value ?? '')) && parsed >= 0) {
    return `+${parsed}`
  }
  return String(parsed)
}

function lineBoxLookupKey(lineBox) {
  return normalizeLookupKey(lineBox?.text ?? '')
}

function findLineBoxesByLookupIncludes(
  lineBoxes,
  lookupIncludes,
  {
    imageSize = { width: 0, height: 0 },
    topMinRatio = 0,
    topMaxRatio = 1,
    leftMinRatio = 0,
    excludeLookupIncludes = [],
  } = {}
) {
  return lineBoxes.filter((lineBox) => {
    const topRatio = imageSize.height > 0 ? lineBox.top / imageSize.height : 0
    const leftRatio = imageSize.width > 0 ? lineBox.left / imageSize.width : 0
    const lookupKey = lineBoxLookupKey(lineBox)
    if (topRatio < topMinRatio || topRatio > topMaxRatio) return false
    if (leftRatio < leftMinRatio) return false
    if (excludeLookupIncludes.some((value) => lookupKey.includes(value))) return false
    return lookupIncludes.some((value) => lookupKey.includes(value))
  })
}

function findNearbyIntegerByLabel(
  lineBoxes,
  imageSize,
  {
    labelIncludes,
    excludeLabelIncludes = [],
    topMinRatio = 0,
    topMaxRatio = 1,
    leftMinRatio = 0,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
    keepPlus = false,
    sameRowTolerance = 14,
    maxYOffset = 56,
    maxXDistance = 260,
  }
) {
  const labels = findLineBoxesByLookupIncludes(lineBoxes, labelIncludes, {
    imageSize,
    topMinRatio,
    topMaxRatio,
    leftMinRatio,
    excludeLookupIncludes: excludeLabelIncludes,
  })
  for (const label of labels) {
    const candidates = [
      label,
      ...lineBoxes.filter(
        (lineBox) =>
          lineBox !== label &&
          lineBox.left >= label.left - 40 &&
          lineBox.left <= label.right + maxXDistance &&
          lineBox.top >= label.top - sameRowTolerance &&
          lineBox.top <= label.bottom + maxYOffset
      ),
    ].sort(
      (left, right) =>
        Math.abs(left.top - label.top) - Math.abs(right.top - label.top) || left.left - right.left
    )
    for (const candidate of candidates) {
      const resolved = normalizeIntegerString(candidate.text, { min, max, keepPlus })
      if (resolved) return resolved
    }
  }
  return ''
}

async function cropImageByBox(filePath, imageSize, box, { paddingX = 24, paddingY = 16 } = {}) {
  const width = imageSize?.width || 0
  const height = imageSize?.height || 0
  if (width <= 0 || height <= 0) return null
  const left = Math.max(0, box.left - paddingX)
  const top = Math.max(0, box.top - paddingY)
  const right = Math.min(width, box.right + paddingX)
  const bottom = Math.min(height, box.bottom + paddingY)
  if (right <= left || bottom <= top) return null
  return cropImageByRatio(filePath, {
    left: left / width,
    top: top / height,
    right: right / width,
    bottom: bottom / height,
  })
}

async function runLineCropOcr({
  filePath,
  imageSize,
  lineBox,
  lang,
  psms = [7, 6],
  paddingX = 24,
  paddingY = 16,
}) {
  let crop = null
  try {
    crop = await cropImageByBox(filePath, imageSize, lineBox, {
      paddingX,
      paddingY,
    })
    if (!crop) return ''
    for (const psm of psms) {
      const text = normalizeOcrTextBlock(await runTesseract(crop.cropPath, lang, psm))
      const firstLine = text
        .split('\n')
        .map((line) => normalizeWhitespace(line))
        .find(Boolean)
      if (firstLine) return firstLine
    }
    return ''
  } catch {
    return ''
  } finally {
    if (crop) await crop.cleanup()
  }
}

function normalizeImagePath(imageRoot, imagePath) {
  return path.relative(imageRoot, imagePath).split(path.sep).join('/')
}

function mapDominantColorToAttribute(color) {
  if (!color) return ''
  const hue = Number(color.h)
  const saturation = Number(color.s)
  const value = Number(color.v)
  if (!Number.isFinite(hue) || !Number.isFinite(saturation) || !Number.isFinite(value)) return ''
  if (saturation < 0.18) return value < 0.82 ? '無' : ''
  if (hue >= 0.96 || hue < 0.045) return '火'
  if (hue < 0.12) return value < 0.75 ? '土' : '聖'
  if (hue < 0.22) return '聖'
  if (hue < 0.45) return '風'
  if (hue < 0.66) return '水'
  if (hue < 0.9) return '闇'
  return '火'
}

function findAttribute(text, lines, dominantColor) {
  for (const line of lines.filter((value) => /(?:^|[\s([{【])(?:属性|attr(?:ibute)?)/i.test(value))) {
    const match = line.match(
      /(?:^|[\s([{【])(?:属性|attr(?:ibute)?)\s*[:：]?\s*(火|水|土|聖|闇|風|無|fire|water|earth|holy|light|dark|wind|none)/i
    )
    if (match) {
      return attributeAliases.get(normalizeLookupKey(match[1])) ?? ''
    }
  }
  for (const line of lines) {
    const match = line.match(/([火水土聖闇風無])属性/)
    if (match) return match[1]
  }
  for (const line of lines.slice(0, 12)) {
    const normalizedLine = normalizeWhitespace(line)
    if (canonicalAttributes.includes(normalizedLine)) return normalizedLine
    for (const [alias, canonical] of attributeAliases.entries()) {
      if (normalizeLookupKey(normalizedLine) === normalizeLookupKey(alias)) return canonical
    }
  }
  return mapDominantColorToAttribute(dominantColor)
}

function findType(text, lines, filePath) {
  const normalizedText = normalizeWhitespace(text).replace(/（/g, '(').replace(/）/g, ')')
  for (const line of lines.filter((value) => /(?:装備タイプ|type|weapon)/i.test(value))) {
    const normalizedLine = normalizeLookupKey(line)
    for (const [alias, canonical] of weaponBaseAliases.entries()) {
      if (!normalizedLine.includes(normalizeLookupKey(alias))) continue
      if (canonical === 'バースト/フルバースト' || canonical === 'フリー') return canonical
      let variant = ''
      for (const [variantAlias, variantCanonical] of weaponVariantAliases.entries()) {
        if (normalizedLine.includes(normalizeLookupKey(variantAlias))) {
          variant = variantCanonical
          break
        }
      }
      return variant ? `${canonical}(${variant})` : canonical
    }
  }
  for (const base of weaponBases) {
    if (normalizedText.includes(base)) {
      let variant = ''
      for (const [alias, canonical] of weaponVariantAliases.entries()) {
        if (normalizedText.includes(alias)) {
          variant = canonical
          break
        }
      }
      return variant ? `${base}(${variant})` : base
    }
  }
  if (normalizedText.includes('アビリティ') || /ability/i.test(normalizedText)) {
    return 'アビリティ'
  }
  if (normalizedText.includes('バースト/フルバースト')) return 'バースト/フルバースト'
  if (normalizedText.includes('フリー')) return 'フリー'
  for (const line of lines.slice(0, 15)) {
    const normalizedLine = normalizeLookupKey(line)
    let base = ''
    for (const [alias, canonical] of weaponBaseAliases.entries()) {
      if (normalizedLine.includes(normalizeLookupKey(alias))) {
        base = canonical
        break
      }
    }
    if (!base) continue
    if (base === 'バースト/フルバースト' || base === 'フリー') return base
    let variant = ''
    for (const [alias, canonical] of weaponVariantAliases.entries()) {
      if (normalizedLine.includes(normalizeLookupKey(alias))) {
        variant = canonical
        break
      }
    }
    return variant ? `${base}(${variant})` : base
  }
  return inferTypeFromFolderName(path.basename(path.dirname(filePath)))
}

function parseLegacyTypeParts(type) {
  const normalizedType = normalizeWhitespace(type)
  if (!normalizedType) return { equipmentType: '', skillType: '通常' }
  if (normalizedType === 'バースト/フルバースト') {
    return { equipmentType: 'バースト/フルバースト', skillType: 'バースト' }
  }
  if (normalizedType === 'フリー') {
    return { equipmentType: 'フリー', skillType: '通常' }
  }
  const match = normalizedType.match(/^(.*?)(?:\((.+)\))?$/)
  const equipmentType = normalizeWhitespace(match?.[1] ?? normalizedType)
  const variant = normalizeWhitespace(match?.[2] ?? '')
  return {
    equipmentType,
    skillType:
      skillTypeAliases.get(normalizeLookupKey(variant)) ??
      skillTypeAliases.get(variant) ??
      '通常',
  }
}

function inferAttackTypeFromEquipmentType(equipmentType) {
  if (['片手直剣', '短剣', '斧'].includes(equipmentType)) return '斬'
  if (['細剣', '槍', '弓'].includes(equipmentType)) return '突'
  if (['棍棒', '盾'].includes(equipmentType)) return '打'
  return ''
}

function findNumberNearLabels(lines, labelPatterns, maxOffset = 2) {
  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = normalizeWhitespace(lines[index])
    if (!labelPatterns.some((pattern) => pattern.test(currentLine))) continue
    for (let offset = 0; offset <= maxOffset; offset += 1) {
      const candidateLine = normalizeWhitespace(lines[index + offset] ?? '')
      const match = candidateLine.match(/([0-9]+(?:\.[0-9]+)?)/)
      if (match) return normalizeWhitespace(match[1])
    }
  }
  return ''
}

function findSkillType(text, lines, legacyType) {
  const topLines = lines.slice(0, 20).map((line) => normalizeWhitespace(line))
  const patterns = [
    { pattern: /full\s*burst(?:\s*skill)?|フルバースト(?:スキル)?/i, value: 'フルバースト' },
    { pattern: /connect(?:\s*skill|\s*slot)?|コネクト|connect slot/i, value: 'コネクト' },
    { pattern: /chain(?:\s*skill)?|チェイン(?:スキル)?/i, value: 'チェイン' },
    { pattern: /mod(?:\s*slot)?/i, value: 'MOD' },
    { pattern: /awaken|recollection|覚醒(?:レベル)?/i, value: '覚醒' },
    { pattern: /accele|アクセル(?:スキル)?/i, value: 'アクセル' },
    { pattern: /(?:^|[^ァ-ヶー一-龥])バースト(?:$|[^ァ-ヶー一-龥])|burst skill/i, value: 'バースト' },
    { pattern: /link|リンク/i, value: 'リンク' },
  ]
  for (const line of topLines) {
    for (const entry of patterns) {
      if (entry.pattern.test(line)) return entry.value
    }
  }
  for (const entry of patterns) {
    if (entry.pattern.test(text)) return entry.value
  }
  return parseLegacyTypeParts(legacyType).skillType
}

function findCost(text, lines) {
  return (
    findNumberNearLabels(lines, [/\bcost\b/i, /コスト/i]) ||
    extractNumberByPatterns(text, ['\\bcost\\b', 'コスト'])
  )
}

function findSp(lines) {
  return findNumberNearLabels(lines, [/消費(?:SP|5P|P)?/i, /SP消費/i], 3)
}

function findAttackType(lines, equipmentType) {
  for (const line of lines.slice(0, 40)) {
    const normalizedLine = normalizeWhitespace(line)
    if (attackTypeAliases.has(normalizedLine)) {
      return attackTypeAliases.get(normalizedLine) ?? ''
    }
  }
  return inferAttackTypeFromEquipmentType(equipmentType)
}

function extractNumberByPatterns(text, patterns) {
  const normalizedText = normalizeWhitespace(text)
  for (const pattern of patterns) {
    const expression = new RegExp(
      `(?:${pattern})[^0-9+-]{0,20}([+-]?[0-9]+(?:\\.[0-9]+)?%?)`,
      'i'
    )
    const match = normalizedText.match(expression)
    if (match) return normalizeWhitespace(match[1])
  }
  return ''
}

const ignoredNameKeys = new Set(['cool', 'ct', 'sw', 'switch', 'br', 'burst'])

function scoreNameLine(line, index, source = 'full') {
  const normalizedLine = normalizeWhitespace(line)
  const lookupKey = normalizeLookupKey(normalizedLine)
  const japaneseCharCount = (normalizedLine.match(/[一-龥ぁ-んァ-ヶ]/g) || []).length
  if (!normalizedLine || ignoredNameKeys.has(lookupKey)) return -100
  if (/^(cool|ct|sw|switch|br|burst|属性|type)\b/i.test(normalizedLine)) return -100
  if (
    /^(?:\[|【)?(?:追加効果|前方|中範囲|発動条件|消費|属性|防御|ダメージ|限界突破数|装備タイプ|備タイプ)/.test(
      normalizedLine
    )
  ) {
    return -100
  }
  if (/^[0-9]+(?:\.[0-9]+)?%?$/.test(normalizedLine)) return -100

  let score = 0
  if (japaneseCharCount > 0) score += 5
  score += Math.min(6, japaneseCharCount)
  if (/[A-Za-z]/.test(normalizedLine)) score += 2
  if (normalizedLine.length >= 3 && normalizedLine.length <= 32) score += 3
  if (normalizedLine.length >= 6 && normalizedLine.length <= 18) score += 3
  if (!/[0-9]/.test(normalizedLine)) score += 2
  if (/[【】]/.test(normalizedLine)) score += 10
  if (/[「」]/.test(normalizedLine)) score += 2
  if (/】\s*[A-Za-z0-9一-龥ぁ-んァ-ヶ]/.test(normalizedLine)) score += 6
  if (/【.*】/.test(normalizedLine)) score += 8
  if (index === 0) score += 2
  if (index <= 2) score += 1
  if (source === 'title') score += 4
  if (normalizedLine.length > 40) score -= 3
  if (/[,:/]/.test(normalizedLine)) score -= 2
  if (/[@\\_=><]/.test(normalizedLine)) score -= 5
  if (/^[~\-./\\]/.test(normalizedLine)) score -= 6
  return score
}

function cleanupExtractedName(value) {
  let normalizedName = normalizeWhitespace(value)
  normalizedName = normalizedName.replace(/^.*?(@\s*)/, '')
  normalizedName = normalizedName.replace(/^.*?(【)/u, '【')
  normalizedName = normalizedName.replace(/^[^A-Za-z0-9一-龥ぁ-んァ-ヶ【「(]+/u, '')
  normalizedName = normalizedName.replace(/[\s|｜\]xX区]+$/u, '')
  normalizedName = normalizedName.replace(/^\(/u, '【')
  if (!normalizedName.includes('【') && normalizedName.includes('】')) {
    const match = normalizedName.match(/([一-龥ぁ-んァ-ヶ][^】]*】.*)$/u)
    normalizedName = match ? `【${match[1]}` : normalizedName
  }
  return normalizedName.replace(/\s+/g, ' ').trim()
}

function findNameFromLines(fullLines, titleLines = []) {
  const candidates = [
    ...titleLines.map((line, index) => ({
      line: normalizeWhitespace(line),
      score: scoreNameLine(line, index, 'title'),
      index,
      source: 'title',
      japaneseCharCount: (normalizeWhitespace(line).match(/[一-龥ぁ-んァ-ヶ]/g) || []).length,
    })),
    ...fullLines.map((line, index) => ({
      line: normalizeWhitespace(line),
      score: scoreNameLine(line, index, 'full'),
      index,
      source: 'full',
      japaneseCharCount: (normalizeWhitespace(line).match(/[一-龥ぁ-んァ-ヶ]/g) || []).length,
    })),
  ]
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.japaneseCharCount - left.japaneseCharCount ||
        (left.source === right.source ? left.index - right.index : 0)
    )
  return cleanupExtractedName(candidates[0]?.line ?? '')
}

function findSkillNameTextFromLines(lines, fullName) {
  const normalizedFullName = normalizeWhitespace(fullName)
  const preferredCandidates = []
  for (let index = 0; index < Math.min(lines.length, 80); index += 1) {
    const currentLine = normalizeWhitespace(lines[index])
    const nextLine = normalizeWhitespace(lines[index + 1] ?? '')
    const nextNextLine = normalizeWhitespace(lines[index + 2] ?? '')
    if (!currentLine || currentLine === normalizedFullName) continue
    if (/[【】]/.test(currentLine)) continue
    if (/[0-9%]/.test(currentLine)) continue
    if (/^(cost|cool|switch|break|exp|属性|装備タイプ|備タイプ|skill)/i.test(currentLine)) {
      continue
    }
    if (/^(消費|発動条件|追加効果|前方|中範囲|ダメージ|防御)/.test(currentLine)) continue
    if (/消費|肖費|SP消費/i.test(nextLine) || /消費|肖費|SP消費/i.test(nextNextLine)) {
      preferredCandidates.push(currentLine)
    }
  }
  const cleanup = (value) =>
    normalizeWhitespace(value)
      .replace(/^[^A-Za-z0-9一-龥ぁ-んァ-ヶー・]+/u, '')
      .replace(/^(?:x|X|\/|\\|\.|,)+\s*/u, '')
      .trim()

  const preferred = preferredCandidates.map(cleanup).find((value) => {
    const katakanaCount = (value.match(/[ァ-ヶー]/g) || []).length
    return katakanaCount >= 3 && value.length >= 4 && value.length <= 24
  })
  if (preferred) return preferred
  return (
    lines.map(cleanup).find((value) => {
      const katakanaCount = (value.match(/[ァ-ヶー]/g) || []).length
      return (
        value &&
        value !== normalizedFullName &&
        !/[【】]/.test(value) &&
        !/[0-9%]/.test(value) &&
        katakanaCount >= 4 &&
        value.length >= 4 &&
        value.length <= 24
      )
    }) ?? ''
  )
}

function cleanupSkillName(value) {
  return normalizeWhitespace(value)
    .replace(/^[^A-Za-z一-龥ぁ-んァ-ヶー・]+/u, '')
    .replace(/[\s|｜]+/gu, '')
    .replace(/^[\\/.\-_=:+]+/u, '')
    .trim()
}

function scoreSkillNameCandidate(value, fullName) {
  const normalizedValue = cleanupSkillName(value)
  const normalizedFullName = normalizeWhitespace(fullName)
  if (!normalizedValue || normalizedValue === normalizedFullName) return -100
  if (/[【】\[\]0-9%]/.test(normalizedValue)) return -100
  if (
    /^(?:cost|cool|switch|break|exp|skill|装備|備タイプ|属性|消費|発動条件|追加効果|前方|中範囲)/i.test(
      normalizedValue
    )
  ) {
    return -100
  }
  const japaneseCount = (normalizedValue.match(/[一-龥ぁ-んァ-ヶ]/g) || []).length
  const katakanaCount = (normalizedValue.match(/[ァ-ヶー]/g) || []).length
  let score = 0
  score += japaneseCount
  score += katakanaCount * 3
  if (normalizedValue.includes('・')) score += 4
  if (normalizedValue.length >= 4 && normalizedValue.length <= 24) score += 5
  if (/^[ァ-ヶー・]+$/u.test(normalizedValue)) score += 5
  if (/[A-Za-z]{3,}/.test(normalizedValue)) score -= 4
  return score
}

function findSkillNameLineBoxes(lineBoxes, imageSize) {
  const labelLines = findLineBoxesByLookupIncludes(
    lineBoxes,
    ['消費', '肖費', '消費sp', 'sp消費', '消費p', '消費5p'],
    {
      imageSize,
      topMinRatio: 0.26,
      topMaxRatio: 0.72,
      leftMinRatio: 0.68,
    }
  )
  const candidates = []
  for (const labelLine of labelLines) {
    for (const lineBox of lineBoxes) {
      if (lineBox === labelLine) continue
      if (lineBox.bottom > labelLine.top) continue
      if (labelLine.top - lineBox.bottom > 96) continue
      if (lineBox.left < labelLine.left - 140) continue
      if (lineBox.right < labelLine.left - 60) continue
      if (
        /^(?:cost|cool|switch|break|exp|skill|装備|備タイプ|属性|発動条件|追加効果|前方|中範囲)/i.test(
          normalizeWhitespace(lineBox.text)
        )
      ) {
        continue
      }
      if (/[%0-9]{3,}/.test(lineBox.text)) continue
      candidates.push({
        lineBox,
        gap: labelLine.top - lineBox.bottom,
        left: lineBox.left,
      })
    }
  }
  candidates.sort(
    (left, right) => left.gap - right.gap || right.left - left.left || left.lineBox.top - right.lineBox.top
  )
  return candidates.map((candidate) => candidate.lineBox)
}

function findNameLineBox(lineBoxes, imageSize) {
  const candidates = lineBoxes
    .filter((lineBox) => {
      const leftRatio = imageSize.width > 0 ? lineBox.left / imageSize.width : 0
      const topRatio = imageSize.height > 0 ? lineBox.top / imageSize.height : 0
      return leftRatio >= 0.68 && topRatio <= 0.16
    })
    .map((lineBox, index) => ({
      lineBox,
      score:
        scoreNameLine(lineBox.text, index, 'title') +
        (/[【】]/.test(lineBox.text) ? 8 : 0) +
        (containsJapaneseText(lineBox.text) ? 4 : -8),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.lineBox.top - right.lineBox.top)
  return candidates[0]?.lineBox ?? null
}

async function findResolvedName({
  filePath,
  imageSize,
  lineBoxes,
  lines,
  titleLines,
  lang,
}) {
  const lineBox = findNameLineBox(lineBoxes, imageSize)
  if (lineBox) {
    const cropped = cleanupExtractedName(
      await runLineCropOcr({
        filePath,
        imageSize,
        lineBox,
        lang,
        psms: [7, 13, 6],
        paddingX: 20,
        paddingY: 14,
      })
    )
    const croppedJapaneseCount = (cropped.match(/[一-龥ぁ-んァ-ヶ]/g) || []).length
    if (cropped && (/[【】]/.test(cropped) || croppedJapaneseCount >= 4)) return cropped
  }
  const fallback = cleanupExtractedName(findNameFromLines(lines, titleLines))
  const japaneseCount = (fallback.match(/[一-龥ぁ-んァ-ヶ]/g) || []).length
  if (!/[【】]/.test(fallback) && japaneseCount < 4) return ''
  if (!/[【】]/.test(fallback) && /[A-Za-z]{3,}/.test(fallback) && japaneseCount < 4) return ''
  return fallback
}

async function findResolvedSkillName({
  filePath,
  imageSize,
  lineBoxes,
  lines,
  fullName,
  lang,
}) {
  const candidateLineBoxes = findSkillNameLineBoxes(lineBoxes, imageSize).slice(0, 5)
  let bestCandidate = ''
  let bestScore = -100
  for (const lineBox of candidateLineBoxes) {
    const cropped = cleanupSkillName(
      await runLineCropOcr({
        filePath,
        imageSize,
        lineBox,
        lang,
        psms: [7, 13, 6],
        paddingX: 28,
        paddingY: 18,
      })
    )
    const croppedScore = scoreSkillNameCandidate(cropped, fullName)
    if (croppedScore > bestScore) {
      bestCandidate = cropped
      bestScore = croppedScore
    }
    const lineTextFallback = cleanupSkillName(lineBox.text)
    const lineTextScore = scoreSkillNameCandidate(lineTextFallback, fullName)
    if (lineTextScore > bestScore) {
      bestCandidate = lineTextFallback
      bestScore = lineTextScore
    }
  }
  if (bestScore > 0) return bestCandidate
  return cleanupSkillName(findSkillNameTextFromLines(lines, fullName))
}

function findResolvedCost(text, lines, lineBoxes, imageSize) {
  return (
    findNearbyIntegerByLabel(lineBoxes, imageSize, {
      labelIncludes: ['cost', 'cast'],
      topMinRatio: 0,
      topMaxRatio: 0.18,
      leftMinRatio: 0.7,
      min: 1,
      max: 120,
      sameRowTolerance: 12,
      maxYOffset: 12,
      maxXDistance: 180,
    }) || normalizeIntegerString(findCost(text, lines), { min: 0, max: 120 })
  )
}

function findResolvedSp(lines, lineBoxes, imageSize) {
  return (
    findNearbyIntegerByLabel(lineBoxes, imageSize, {
      labelIncludes: ['消費', '肖費', '消費sp', 'sp消費', '消費p', '消費5p'],
      topMinRatio: 0.26,
      topMaxRatio: 0.72,
      leftMinRatio: 0.68,
      min: 0,
      max: 100,
      sameRowTolerance: 18,
      maxYOffset: 32,
      maxXDistance: 160,
    }) || normalizeIntegerString(findSp(lines), { min: 0, max: 100 })
  )
}

function findResolvedCooldown(text, lineBoxes, imageSize) {
  return (
    findNearbyIntegerByLabel(lineBoxes, imageSize, {
      labelIncludes: ['skillcooltime', 'cooltime'],
      excludeLabelIncludes: ['burst'],
      topMinRatio: 0.04,
      topMaxRatio: 0.24,
      leftMinRatio: 0.7,
      min: 1,
      max: 300,
      sameRowTolerance: 12,
      maxYOffset: 12,
      maxXDistance: 180,
    }) ||
    normalizeIntegerString(
      extractNumberByPatterns(text, ['\\bcool(?:\\s*time)?\\b', '\\bct\\b', 'クール(?:タイム)?']),
      { min: 1, max: 300 }
    )
  )
}

function buildTypeSlug(type) {
  const normalizedType = normalizeWhitespace(type)
  if (!normalizedType) return 'unknown'
  const match = normalizedType.match(/^(.*?)(?:\((.+)\))?$/)
  const base = normalizeWhitespace(match?.[1] ?? normalizedType)
  const variant = normalizeWhitespace(match?.[2] ?? '')
  const baseSlug = baseTypeSlugMap[base] ?? 'unknown'
  if (!variant) return baseSlug
  const variantSlug = variantTypeSlugMap[variant] ?? normalizeLookupKey(variant)
  return `${baseSlug}-${variantSlug}`
}

function buildDraftId({ element, equipmentType, filePath }) {
  const baseName = path.basename(filePath, path.extname(filePath)).toLowerCase()
  const attrSlug = attributeSlugMap[element] ?? 'unknown'
  const typeSlug = buildTypeSlug(equipmentType)
  return `skill-${attrSlug}-${typeSlug}-${baseName}`
}

async function buildRecordFromOcr({
  filePath,
  imagePath,
  combinedText,
  lines,
  titleLines,
  lineBoxes,
  imageSize,
  dominantColor,
  rarity,
  lang,
}) {
  const element = findAttribute(combinedText, lines, dominantColor)
  const legacyType = findType(combinedText, lines, filePath)
  const typeParts = parseLegacyTypeParts(legacyType)
  const name = await findResolvedName({
    filePath,
    imageSize,
    lineBoxes,
    lines,
    titleLines,
    lang,
  })
  const cost = findResolvedCost(combinedText, lines, lineBoxes, imageSize)
  const sp = findResolvedSp(lines, lineBoxes, imageSize)
  const skillType = findSkillType(combinedText, lines, legacyType)
  const attackType = findAttackType(lines, typeParts.equipmentType)
  const cooldown = findResolvedCooldown(combinedText, lineBoxes, imageSize)
  const switchGauge = extractNumberByPatterns(combinedText, [
    '\\bsw(?:\\s*gauge)?\\b',
    'switch(?:\\s*gauge)?',
    'スイッチ(?:ゲージ)?',
  ])
  const breakGauge = extractNumberByPatterns(combinedText, [
    '\\bbr(?:\\s*gauge)?\\b',
    'break(?:\\s*gauge)?',
    'バースト(?:ゲージ)?',
    'ブレイク(?:ゲージ)?',
  ])
  const skillName = await findResolvedSkillName({
    filePath,
    imageSize,
    lineBoxes,
    lines,
    fullName: name,
    lang,
  })

  return {
    id: buildDraftId({ element, equipmentType: typeParts.equipmentType, filePath }),
    name,
    rarity,
    cost,
    equipmentType: typeParts.equipmentType,
    sp,
    element,
    skillType,
    attackType,
    breakGauge: normalizeIntegerString(breakGauge, { min: -999, max: 999, keepPlus: true }),
    switchGauge: normalizeIntegerString(switchGauge, { min: -999, max: 999, keepPlus: true }),
    cooldown,
    skillName,
    image: imagePath,
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  const limit = Math.max(1, concurrency)
  const results = new Array(items.length)
  let nextIndex = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  })
  await Promise.all(runners)
  return results
}

function createCsv(records) {
  const headers = [
    'id',
    'name',
    'rarity',
    'cost',
    'equipmentType',
    'sp',
    'element',
    'skillType',
    'attackType',
    'breakGauge',
    'switchGauge',
    'cooldown',
    'skillName',
    'image',
  ]
  const rows = [headers.join(',')]
  records.forEach((record) => {
    rows.push(headers.map((header) => escapeCsv(record[header] ?? '')).join(','))
  })
  return `${rows.join('\n')}\n`
}

async function runUploadImages({ draftCsvPath, imageRoot, outputPath }) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    path.resolve(process.cwd(), 'scripts/skill-master/upload-images.mjs'),
    '--file',
    draftCsvPath,
    '--image-base-dir',
    imageRoot,
    '--output',
    outputPath,
  ])
  if (stdout.trim()) console.log(stdout.trim())
  if (stderr.trim()) console.error(stderr.trim())
}

function buildSummary(results) {
  return results.reduce(
    (summary, result) => {
      if (result.status === 'ok') {
        summary.ok += 1
        if (!result.record.name) summary.blankName += 1
        if (!result.record.element) summary.blankAttr += 1
        if (!result.record.equipmentType) summary.blankType += 1
        if (!result.record.cooldown) summary.blankCool += 1
        if (!result.record.switchGauge) summary.blankSwGauge += 1
        if (!result.record.breakGauge) summary.blankBrGauge += 1
        return summary
      }
      if (result.status === 'pointer') {
        summary.pointer += 1
        return summary
      }
      summary.failed += 1
      return summary
    },
    {
      ok: 0,
      pointer: 0,
      failed: 0,
      blankName: 0,
      blankAttr: 0,
      blankType: 0,
      blankCool: 0,
      blankSwGauge: 0,
      blankBrGauge: 0,
    }
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(usage)
    return
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency <= 0) {
    throw new Error(`Invalid --concurrency value "${args.concurrency}". Use a positive integer.`)
  }
  if (args.limit && (!Number.isInteger(args.limit) || args.limit < 0)) {
    throw new Error(`Invalid --limit value "${args.limit}". Use 0 or a positive integer.`)
  }
  if (!Array.isArray(args.psms) || args.psms.length === 0) {
    throw new Error('Invalid --psm value. Use a comma-separated list like "6,11".')
  }

  await ensureTesseractAvailable()
  const { inputDir, imageRoot, outputPath, debugJsonPath } = resolveRuntimePaths(args)
  const allImages = await walkImages(inputDir)
  const imageFiles = args.limit > 0 ? allImages.slice(0, args.limit) : allImages
  if (imageFiles.length === 0) {
    throw new Error(`No image files found under ${inputDir}`)
  }

  const results = await runWithConcurrency(imageFiles, args.concurrency, async (filePath) => {
    if (await isGitLfsPointerFile(filePath)) {
      return {
        status: 'pointer',
        filePath,
        message: 'Git LFS pointer file detected. Pull the real image binary before running OCR.',
      }
    }
    try {
      const { combinedText, lines } = await runOcrPasses(filePath, args.lang, args.psms)
      const titleLines = await runTitleCropOcr(filePath, args.lang)
      const { lineBoxes, imageSize } = await runStructuredOcr(filePath, args.lang)
      const rarity = await detectRarityStarCount(filePath)
      const dominantColor = await detectDominantColorByRatio(filePath, ATTR_REGION_RATIOS)
      const imagePath = normalizeImagePath(imageRoot, filePath)
      const record = await buildRecordFromOcr({
        filePath,
        imagePath,
        combinedText,
        lines,
        titleLines,
        lineBoxes,
        imageSize,
        dominantColor,
        rarity,
        lang: args.lang,
      })
      return {
        status: 'ok',
        filePath,
        imagePath,
        ocrText: combinedText,
        lines,
        titleLines,
        lineBoxes,
        imageSize,
        dominantColor,
        record,
      }
    } catch (error) {
      return {
        status: 'failed',
        filePath,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  })

  const successfulResults = results.filter((result) => result.status === 'ok')
  const pointerResults = results.filter((result) => result.status === 'pointer')
  const failedResults = results.filter((result) => result.status === 'failed')

  if (successfulResults.length === 0) {
    pointerResults.forEach((result) => console.error(`${result.filePath}: ${result.message}`))
    failedResults.forEach((result) => console.error(`${result.filePath}: ${result.message}`))
    throw new Error('No OCR rows were produced.')
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  const csvContent = createCsv(successfulResults.map((result) => result.record))

  let draftCsvPath = outputPath
  if (args.uploadImages) {
    draftCsvPath = path.join(
      os.tmpdir(),
      `skill-master-ocr-draft-${Date.now()}-${Math.random().toString(16).slice(2)}.csv`
    )
  }

  await fs.writeFile(draftCsvPath, csvContent, 'utf8')

  if (debugJsonPath) {
    await fs.mkdir(path.dirname(debugJsonPath), { recursive: true })
    await fs.writeFile(debugJsonPath, `${JSON.stringify(successfulResults, null, 2)}\n`, 'utf8')
  }

  if (args.uploadImages) {
    try {
      await fs.rm(outputPath, { force: true })
      await runUploadImages({
        draftCsvPath,
        imageRoot,
        outputPath,
      })
    } finally {
      await fs.rm(draftCsvPath, { force: true })
    }
  }

  const summary = buildSummary(results)
  console.log(`Input dir: ${inputDir}`)
  console.log(`Image root: ${imageRoot}`)
  console.log(`Output CSV: ${outputPath}`)
  console.log(`Scanned images: ${imageFiles.length}`)
  console.log(`Rows written: ${summary.ok}`)
  console.log(`Git LFS pointers: ${summary.pointer}`)
  console.log(`OCR failures: ${summary.failed}`)
  console.log(`Blank name: ${summary.blankName}`)
  console.log(`Blank element: ${summary.blankAttr}`)
  console.log(`Blank equipmentType: ${summary.blankType}`)
  console.log(`Blank cooldown: ${summary.blankCool}`)
  console.log(`Blank switchGauge: ${summary.blankSwGauge}`)
  console.log(`Blank breakGauge: ${summary.blankBrGauge}`)
  if (debugJsonPath) console.log(`Debug JSON: ${debugJsonPath}`)
  if (summary.pointer > 0) {
    console.log('Some files were Git LFS pointers and were skipped. Pull the real image binaries to OCR them.')
  }
  if (args.uploadImages) {
    console.log(
      `Next step: review ${JSON.stringify(outputPath)}, then run npm run skill-master:import -- --file ${JSON.stringify(outputPath)} --dry-run`
    )
  } else {
    console.log(
      `Next step: review ${JSON.stringify(outputPath)}, then run npm run skill-master:upload-images -- --file ${JSON.stringify(outputPath)} --image-base-dir ${JSON.stringify(imageRoot)}`
    )
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
