import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import crypto from 'node:crypto'
import admin from 'firebase-admin'

/*
 * 画像ファイルの事前準備
 * ----------------------
 * 1. アップロード前の元画像は、ローカルの任意フォルダにまとめて置いてください。
 *    例:
 *      scripts/skill-master/source-images/
 *        fire/
 *          skill-fire-sword-link-001.png
 *        water/
 *          skill-water-bow-002.webp
 *
 *    あるいは 1 フォルダに平置きでも構いません。
 *      scripts/skill-master/source-images/
 *        skill-fire-sword-link-001.png
 *        skill-water-bow-002.webp
 *
 * 2. 入力 CSV / JSON の image 列には、Firebase の URL ではなく
 *    「ローカル画像へのパス」または「ファイル名」を書いてください。
 *    例:
 *      image = fire/skill-fire-sword-link-001.png
 *      image = skill-water-bow-002.webp
 *
 * 3. 上のような相対パスで管理する場合は、--image-base-dir を付けると
 *    そのフォルダを基準に image 列の値を解決します。
 *    例:
 *      npm run skill-master:upload-images -- \
 *        --file ./scripts/skill-master/skill-master.csv \
 *        --image-base-dir ./scripts/skill-master/source-images
 *
 * 4. --image-base-dir を付けない場合、相対パスは
 *    入力 CSV / JSON ファイルが置かれているフォルダ基準で解決されます。
 *
 * 5. このスクリプト実行後は、image 列が Firebase Storage の URL に置き換わった
 *    出力ファイルが生成されるので、その出力ファイルを
 *    "npm run skill-master:import" に渡してください。
 */

const STORAGE_BUCKET = 'recordmanagements-756bf.appspot.com'
const DEFAULT_CACHE_CONTROL = 'public,max-age=31536000,immutable'

const usage = `Usage:
  npm run skill-master:upload-images -- --file ./path/to/skill-master.csv --validate-only
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run skill-master:upload-images -- --file ./path/to/skill-master.csv --dry-run
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run skill-master:upload-images -- --file ./path/to/skill-master.csv --output ./tmp/skill-master.storage.csv
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run skill-master:upload-images -- --file ./path/to/skill-master.json --image-base-dir ./assets/skill-images

Options:
  --file <path>            Required. Input file in .json or .csv format.
  --output <path>          Optional. Output file path. Defaults beside the source file.
  --image-base-dir <path>  Optional. Base directory for relative local image paths.
  --concurrency <number>   Optional. Parallel upload count. Default: 8.
  --validate-only          Validate rows and local files without Storage access.
  --dry-run                Inspect Storage state and planned changes without writing.
  --help                   Show this help.

Workflow:
  1. Keep the original skill master file as the editable source of truth.
  2. Put a local file path or simple file name in each image field you want to upload.
  3. Run this script to upload only changed files and emit a URL-filled output file.
  4. Feed that output file into "npm run skill-master:import".

Storage layout:
  skill_master_images/{prefix}/{skillId}/source.{ext}

Why this layout:
  - based on immutable skillId, so attr/type changes do not force re-upload
  - one directory per skill leaves room for future variants like thumb.webp
  - a 2-char prefix shard prevents one large flat directory
`

function parseArgs(argv) {
  const args = {
    file: '',
    output: '',
    imageBaseDir: '',
    concurrency: 8,
    validateOnly: false,
    dryRun: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--file') {
      args.file = argv[index + 1] || ''
      index += 1
      continue
    }

    if (arg === '--output') {
      args.output = argv[index + 1] || ''
      index += 1
      continue
    }

    if (arg === '--image-base-dir') {
      args.imageBaseDir = argv[index + 1] || ''
      index += 1
      continue
    }

    if (arg === '--concurrency') {
      args.concurrency = Number(argv[index + 1] || '8')
      index += 1
      continue
    }

    if (arg === '--validate-only') {
      args.validateOnly = true
      continue
    }

    if (arg === '--dry-run') {
      args.dryRun = true
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
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCsv(content) {
  const rows = []
  let current = ''
  let row = []
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1
      }

      row.push(current)
      current = ''

      if (row.some((cell) => normalizeWhitespace(cell) !== '')) {
        rows.push(row)
      }

      row = []
      continue
    }

    current += char
  }

  if (current !== '' || row.length > 0) {
    row.push(current)
    if (row.some((cell) => normalizeWhitespace(cell) !== '')) {
      rows.push(row)
    }
  }

  if (rows.length === 0) {
    return { headers: [], records: [] }
  }

  const headers = rows[0].map((cell) => normalizeWhitespace(cell))
  const records = rows.slice(1).map((cells, rowIndex) => {
    const record = {}
    headers.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex] ?? ''
    })
    record.__rowNumber = rowIndex + 2
    return record
  })

  return { headers, records }
}

async function loadSource(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath)
  const content = await fs.readFile(absolutePath, 'utf8')
  const extension = path.extname(absolutePath).toLowerCase()

  if (extension === '.json') {
    const parsed = JSON.parse(content)

    if (Array.isArray(parsed)) {
      return {
        absolutePath,
        extension,
        format: 'json-array',
        headers: [],
        rootObject: null,
        records: parsed.map((record, index) => ({
          ...record,
          __rowNumber: index + 1,
        })),
      }
    }

    if (parsed && Array.isArray(parsed.skills)) {
      return {
        absolutePath,
        extension,
        format: 'json-object',
        headers: [],
        rootObject: parsed,
        records: parsed.skills.map((record, index) => ({
          ...record,
          __rowNumber: index + 1,
        })),
      }
    }

    throw new Error('JSON input must be an array or an object with a "skills" array.')
  }

  if (extension === '.csv') {
    const { headers, records } = parseCsv(content)
    return {
      absolutePath,
      extension,
      format: 'csv',
      headers,
      rootObject: null,
      records,
    }
  }

  throw new Error('Unsupported input format. Use .json or .csv.')
}

function createDefaultOutputPath(sourcePath, extension) {
  const directory = path.dirname(sourcePath)
  const baseName = path.basename(sourcePath, extension)
  return path.join(directory, `${baseName}.storage${extension}`)
}

function isRemoteImageReference(value) {
  const normalized = normalizeWhitespace(value)
  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('gs://') ||
    normalized.startsWith('data:')
  )
}

function sanitizeSkillId(skillId) {
  return normalizeWhitespace(skillId)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function inferContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase()

  if (extension === '.png') return 'image/png'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.webp') return 'image/webp'
  if (extension === '.gif') return 'image/gif'
  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.avif') return 'image/avif'
  if (extension === '.bmp') return 'image/bmp'

  return 'application/octet-stream'
}

function resolveLocalImagePath(imageValue, sourceFilePath, imageBaseDir) {
  const normalized = normalizeWhitespace(imageValue)
  if (!normalized || isRemoteImageReference(normalized)) {
    return null
  }

  if (path.isAbsolute(normalized)) {
    return normalized
  }

  if (imageBaseDir) {
    return path.resolve(process.cwd(), imageBaseDir, normalized)
  }

  return path.resolve(path.dirname(sourceFilePath), normalized)
}

function createStorageObjectPath(skillId, localImagePath) {
  const safeSkillId = sanitizeSkillId(skillId)
  if (!safeSkillId) {
    throw new Error(`Cannot build Storage path from empty skill id "${skillId}".`)
  }

  const prefix = safeSkillId.slice(0, 2) || 'misc'
  const extension = path.extname(localImagePath).toLowerCase() || '.bin'
  return `skill_master_images/${prefix}/${safeSkillId}/source${extension}`
}

function createDownloadUrl(bucketName, objectPath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`
}

function readExistingToken(metadata) {
  const raw = metadata?.metadata?.firebaseStorageDownloadTokens || ''
  return normalizeWhitespace(String(raw).split(',')[0] || '')
}

async function ensureAdminApp() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: STORAGE_BUCKET,
    })
  }
}

async function createUploadTasks(records, sourceFilePath, imageBaseDir) {
  const tasks = []
  const errors = []

  for (const record of records) {
    const rowNumber = record.__rowNumber ?? '?'
    const skillId = normalizeWhitespace(record.id)

    if (!skillId) {
      errors.push(`Row ${rowNumber}: id is required.`)
      continue
    }

    const imageValue = normalizeWhitespace(record.image)
    if (!imageValue || isRemoteImageReference(imageValue)) {
      continue
    }

    const localImagePath = resolveLocalImagePath(imageValue, sourceFilePath, imageBaseDir)
    if (!localImagePath) {
      continue
    }

    try {
      await fs.access(localImagePath)
    } catch {
      errors.push(`Row ${rowNumber}: image file not found at ${localImagePath}`)
      continue
    }

    tasks.push({
      skillId,
      rowNumber,
      localImagePath,
      objectPath: createStorageObjectPath(skillId, localImagePath),
      contentType: inferContentType(localImagePath),
    })
  }

  return { tasks, errors }
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

async function syncImageTask(bucket, task, dryRun) {
  const fileBuffer = await fs.readFile(task.localImagePath)
  const localMd5 = crypto.createHash('md5').update(fileBuffer).digest('base64')
  const file = bucket.file(task.objectPath)
  const [exists] = await file.exists()
  let token = ''

  if (exists) {
    const [metadata] = await file.getMetadata()
    token = readExistingToken(metadata)
    const remoteMd5 = normalizeWhitespace(metadata.md5Hash)

    if (remoteMd5 && remoteMd5 === localMd5) {
      if (token) {
        return {
          status: 'skipped',
          ...task,
          downloadUrl: createDownloadUrl(bucket.name, task.objectPath, token),
        }
      }

      token = crypto.randomUUID()
      if (dryRun) {
        return {
          status: 'would-update-metadata',
          ...task,
          downloadUrl: createDownloadUrl(bucket.name, task.objectPath, token),
        }
      }

      await file.setMetadata({
        cacheControl: metadata.cacheControl || DEFAULT_CACHE_CONTROL,
        contentType: metadata.contentType || task.contentType,
        metadata: {
          ...(metadata.metadata || {}),
          firebaseStorageDownloadTokens: token,
          sourceMd5: localMd5,
        },
      })

      return {
        status: 'metadata-updated',
        ...task,
        downloadUrl: createDownloadUrl(bucket.name, task.objectPath, token),
      }
    }
  }

  token = token || crypto.randomUUID()
  if (dryRun) {
    return {
      status: exists ? 'would-overwrite' : 'would-upload',
      ...task,
      downloadUrl: createDownloadUrl(bucket.name, task.objectPath, token),
    }
  }

  await file.save(task.fileBuffer, {
    resumable: false,
    metadata: {
      cacheControl: DEFAULT_CACHE_CONTROL,
      contentType: task.contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
        sourceMd5: localMd5,
      },
    },
  })

  return {
    status: exists ? 'overwritten' : 'uploaded',
    ...task,
    downloadUrl: createDownloadUrl(bucket.name, task.objectPath, token),
  }
}

function buildUpdatedRecords(records, uploadResultsByRowNumber) {
  return records.map((record) => {
    const updatedImage = uploadResultsByRowNumber.get(record.__rowNumber)?.downloadUrl
    return {
      ...record,
      ...(updatedImage ? { image: updatedImage } : {}),
    }
  })
}

function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

async function writeOutputFile({
  outputPath,
  format,
  headers,
  rootObject,
  records,
}) {
  const sanitizedRecords = records.map((record) => {
    const nextRecord = { ...record }
    delete nextRecord.__rowNumber
    return nextRecord
  })

  if (format === 'json-array') {
    await fs.writeFile(outputPath, `${JSON.stringify(sanitizedRecords, null, 2)}\n`, 'utf8')
    return
  }

  if (format === 'json-object') {
    await fs.writeFile(
      outputPath,
      `${JSON.stringify({ ...rootObject, skills: sanitizedRecords }, null, 2)}\n`,
      'utf8'
    )
    return
  }

  const outputHeaders = headers.length
    ? headers
    : [...new Set(sanitizedRecords.flatMap((record) => Object.keys(record)))]
  const rows = [outputHeaders.join(',')]

  sanitizedRecords.forEach((record) => {
    rows.push(outputHeaders.map((header) => escapeCsv(record[header] ?? '')).join(','))
  })

  await fs.writeFile(outputPath, `${rows.join('\n')}\n`, 'utf8')
}

function printSummary({
  sourceFile,
  outputFile,
  totalRows,
  uploadTaskCount,
  statusCounts,
  validateOnly,
  dryRun,
}) {
  console.log(`Input file: ${sourceFile}`)
  console.log(`Output file: ${outputFile}`)
  console.log(`Rows: ${totalRows}`)
  console.log(`Local image entries: ${uploadTaskCount}`)

  Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .forEach(([status, count]) => {
      console.log(`${status}: ${count}`)
    })

  if (validateOnly) {
    console.log('Mode: validate-only')
  } else if (dryRun) {
    console.log('Mode: dry-run')
  } else {
    console.log('Mode: apply')
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help || !args.file) {
    console.log(usage)
    process.exit(args.help ? 0 : 1)
  }

  if (!Number.isInteger(args.concurrency) || args.concurrency <= 0) {
    throw new Error(`Invalid --concurrency value "${args.concurrency}". Use a positive integer.`)
  }

  const source = await loadSource(args.file)
  const outputPath = args.output
    ? path.resolve(process.cwd(), args.output)
    : createDefaultOutputPath(source.absolutePath, source.extension)

  const { tasks, errors } = await createUploadTasks(
    source.records,
    source.absolutePath,
    args.imageBaseDir
  )

  if (errors.length > 0) {
    errors.forEach((error) => console.error(error))
    process.exit(1)
  }

  let uploadResults = []

  if (!args.validateOnly && tasks.length > 0) {
    await ensureAdminApp()
    const bucket = admin.storage().bucket()
    uploadResults = await runWithConcurrency(tasks, args.concurrency, (task) =>
      syncImageTask(bucket, task, args.dryRun)
    )
  }

  const uploadResultsByRowNumber = new Map(
    uploadResults.map((result) => [result.rowNumber, result])
  )
  const updatedRecords = buildUpdatedRecords(source.records, uploadResultsByRowNumber)
  const shouldWriteOutput = args.validateOnly || !args.dryRun

  if (shouldWriteOutput) {
    await writeOutputFile({
      outputPath,
      format: source.format,
      headers: source.headers,
      rootObject: source.rootObject,
      records: updatedRecords,
    })
  }

  const statusCounts = uploadResults.reduce(
    (summary, result) => {
      summary[result.status] = (summary[result.status] || 0) + 1
      return summary
    },
    {
      uploaded: 0,
      overwritten: 0,
      skipped: 0,
      'metadata-updated': 0,
      'would-upload': 0,
      'would-overwrite': 0,
      'would-update-metadata': 0,
    }
  )

  printSummary({
    sourceFile: source.absolutePath,
    outputFile: shouldWriteOutput ? outputPath : `${outputPath} (not written in dry-run)`,
    totalRows: source.records.length,
    uploadTaskCount: tasks.length,
    statusCounts,
    validateOnly: args.validateOnly,
    dryRun: args.dryRun,
  })

  if (tasks.length > 0) {
    if (args.dryRun) {
      console.log(
        `Next step: rerun without --dry-run to emit ${JSON.stringify(outputPath)}, then run npm run skill-master:import -- --file ${JSON.stringify(outputPath)} --dry-run`
      )
    } else {
      console.log(
        `Next step: npm run skill-master:import -- --file ${JSON.stringify(outputPath)} --dry-run`
      )
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
