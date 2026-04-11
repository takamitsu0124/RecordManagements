import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
	collection,
	doc,
	getDocs,
	getFirestore,
	serverTimestamp,
	writeBatch,
} from 'firebase/firestore'

const firebaseConfig = {
	apiKey: 'AIzaSyAbP781Dp0Nw-AStVWf2cTnrOcrOQO3H7U',
	authDomain: 'recordmanagements-756bf.firebaseapp.com',
	projectId: 'recordmanagements-756bf',
	storageBucket: 'recordmanagements-756bf.appspot.com',
	messagingSenderId: '330209751384',
	appId: '1:330209751384:web:a944d02b0e5adfa8a5352d',
	measurementId: 'G-Z6LZKFB4BN',
}

const usage = `Usage:
  npm run skill-master:import -- --file ./path/to/skill-master.json --validate-only
  FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run skill-master:import -- --file ./path/to/skill-master.json --dry-run
  FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run skill-master:import -- --file ./path/to/skill-master.json
  FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run skill-master:import -- --file ./path/to/skill-master.json --prune-missing

Options:
  --file <path>         Required. Input file in .json or .csv format.
  --validate-only       Validate and normalize locally without Firebase access.
  --dry-run             Authenticate and inspect diffs, but do not write.
  --prune-missing       Delete skill_master docs not present in the input when safe.
  --help                Show this help.

Environment variables:
  FIREBASE_AUTH_EMAIL
  FIREBASE_AUTH_PASSWORD
`

const canonicalAttributes = ['火', '水', '土', '聖', '闇', '風', '無']
const weaponBases = [
	'片手直剣',
	'細剣',
	'棍棒',
	'短剣',
	'斧',
	'槍',
	'弓',
	'盾',
]
const weaponVariants = ['', '覚醒', 'アクセル', 'MOD', 'コネクト', 'チェイン', 'リンク']
const abilityVariants = ['', '覚醒', 'アクセル', 'チェイン', 'リンク']
const legacyExtraTypes = ['バースト/フルバースト', 'フリー']
const canonicalTypes = [
	...weaponBases.flatMap((base) =>
		weaponVariants.map((variant) =>
			variant === '' ? base : `${base}(${variant})`
		)
	),
	...abilityVariants.map((variant) =>
		variant === '' ? 'アビリティ' : `アビリティ(${variant})`
	),
	...legacyExtraTypes,
]

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

const baseTypeAliases = new Map([
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
	['burst_fullburst', 'バースト/フルバースト'],
	['フリー', 'フリー'],
	['free', 'フリー'],
])

const variantAliases = new Map([
	['', ''],
	['base', ''],
	['normal', ''],
	['覚醒', '覚醒'],
	['awaken', '覚醒'],
	['recollection', '覚醒'],
	['アクセル', 'アクセル'],
	['accele', 'アクセル'],
	['mod', 'MOD'],
	['connect', 'コネクト'],
	['コネクト', 'コネクト'],
	['chain', 'チェイン'],
	['チェイン', 'チェイン'],
	['link', 'リンク'],
	['リンク', 'リンク'],
])

function parseArgs(argv) {
	const args = {
		file: '',
		validateOnly: false,
		dryRun: false,
		pruneMissing: false,
		help: false,
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]

		if (arg === '--file') {
			args.file = argv[index + 1] || ''
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

		if (arg === '--prune-missing') {
			args.pruneMissing = true
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

function normalizeLookupKey(value) {
	return normalizeWhitespace(value).toLowerCase().replace(/[\s_()-]/g, '')
}

function normalizeId(value) {
	return normalizeWhitespace(value)
}

function normalizeName(value) {
	return normalizeWhitespace(value)
}

function normalizeTextField(value) {
	return normalizeWhitespace(value)
}

function normalizeAttribute(value) {
	const raw = normalizeWhitespace(value)
	const normalized =
		attributeAliases.get(normalizeLookupKey(raw)) ?? attributeAliases.get(raw)

	if (!normalized) {
		throw new Error(
			`Unsupported attr "${raw}". Supported canonical values: ${canonicalAttributes.join(', ')}`
		)
	}

	return normalized
}

function normalizeType(value) {
	const raw = normalizeWhitespace(value)
	const directLegacyMatch = canonicalTypes.find((type) => type === raw)
	if (directLegacyMatch) return directLegacyMatch

	const normalizedRaw = raw.replace(/（/g, '(').replace(/）/g, ')')
	const compactRaw = normalizeLookupKey(normalizedRaw)

	const directBaseMatch =
		baseTypeAliases.get(compactRaw) ?? baseTypeAliases.get(normalizedRaw)
	if (directBaseMatch) {
		return directBaseMatch
	}

	const rawMatch = normalizedRaw.match(/^(.*?)(?:\((.+)\))?$/)
	const rawBase = normalizeWhitespace(rawMatch?.[1] ?? normalizedRaw)
	const rawVariant = normalizeWhitespace(rawMatch?.[2] ?? '')
	const normalizedBase =
		baseTypeAliases.get(normalizeLookupKey(rawBase)) ?? baseTypeAliases.get(rawBase)
	const normalizedVariant =
		variantAliases.get(normalizeLookupKey(rawVariant)) ??
		variantAliases.get(rawVariant)

	if (
		normalizedBase &&
		normalizedVariant !== undefined &&
		normalizedBase !== 'バースト/フルバースト' &&
		normalizedBase !== 'フリー'
	) {
		if (normalizedBase === 'アビリティ') {
			if (!abilityVariants.includes(normalizedVariant)) {
				throw new Error(
					`Ability type "${raw}" cannot use variant "${normalizedVariant}".`
				)
			}

			return normalizedVariant === ''
				? 'アビリティ'
				: `アビリティ(${normalizedVariant})`
		}

		if (!weaponVariants.includes(normalizedVariant)) {
			throw new Error(
				`Weapon type "${raw}" cannot use variant "${normalizedVariant}".`
			)
		}

		return normalizedVariant === ''
			? normalizedBase
			: `${normalizedBase}(${normalizedVariant})`
	}

	const parts = normalizedRaw
		.split(/[:/_-]/)
		.map((part) => normalizeWhitespace(part))
		.filter(Boolean)
	if (parts.length >= 1) {
		const basePart = parts[0]
		const variantPart = parts.slice(1).join('')
		const normalizedSplitBase =
			baseTypeAliases.get(normalizeLookupKey(basePart)) ??
			baseTypeAliases.get(basePart)
		const normalizedSplitVariant =
			variantAliases.get(normalizeLookupKey(variantPart)) ??
			variantAliases.get(variantPart)

		if (
			normalizedSplitBase &&
			normalizedSplitVariant !== undefined &&
			normalizedSplitBase !== 'バースト/フルバースト' &&
			normalizedSplitBase !== 'フリー'
		) {
			if (normalizedSplitBase === 'アビリティ') {
				if (!abilityVariants.includes(normalizedSplitVariant)) {
					throw new Error(
						`Ability type "${raw}" cannot use variant "${normalizedSplitVariant}".`
					)
				}

				return normalizedSplitVariant === ''
					? 'アビリティ'
					: `アビリティ(${normalizedSplitVariant})`
			}

			if (!weaponVariants.includes(normalizedSplitVariant)) {
				throw new Error(
					`Weapon type "${raw}" cannot use variant "${normalizedSplitVariant}".`
				)
			}

			return normalizedSplitVariant === ''
				? normalizedSplitBase
				: `${normalizedSplitBase}(${normalizedSplitVariant})`
		}
	}

	throw new Error(
		`Unsupported type "${raw}". Supported canonical values: ${canonicalTypes.join(', ')}`
	)
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
		return []
	}

	const headers = rows[0].map((cell) => normalizeWhitespace(cell))

	return rows.slice(1).map((cells, rowIndex) => {
		const record = {}
		headers.forEach((header, index) => {
			record[header] = cells[index] ?? ''
		})
		record.__rowNumber = rowIndex + 2
		return record
	})
}

async function loadSource(filePath) {
	const absolutePath = path.resolve(process.cwd(), filePath)
	const content = await fs.readFile(absolutePath, 'utf8')
	const extension = path.extname(absolutePath).toLowerCase()

	if (extension === '.json') {
		const parsed = JSON.parse(content)
		if (Array.isArray(parsed)) {
			return parsed
		}
		if (Array.isArray(parsed.skills)) {
			return parsed.skills
		}
		throw new Error('JSON input must be an array or an object with a "skills" array.')
	}

	if (extension === '.csv') {
		return parseCsv(content)
	}

	throw new Error('Unsupported input format. Use .json or .csv.')
}

function normalizeRecords(records) {
	const normalized = []
	const errors = []
	const duplicateIds = new Set()
	const seenIds = new Set()
	let normalizedAttrCount = 0
	let normalizedTypeCount = 0

	records.forEach((record, index) => {
		const rowNumber = record.__rowNumber ?? index + 1
		const id = normalizeId(record.id)
		const name = normalizeName(record.name)
		const attrInput = record.attr
		const typeInput = record.type
		const hasCool = Object.prototype.hasOwnProperty.call(record, 'cool')
		const hasSwGauge = Object.prototype.hasOwnProperty.call(record, 'swGauge')
		const hasBrGauge = Object.prototype.hasOwnProperty.call(record, 'brGauge')
		const hasImage = Object.prototype.hasOwnProperty.call(record, 'image')

		if (
			!id ||
			!name ||
			normalizeWhitespace(attrInput) === '' ||
			normalizeWhitespace(typeInput) === '' ||
			!hasCool ||
			!hasSwGauge ||
			!hasBrGauge ||
			!hasImage
		) {
			errors.push(
				`Row ${rowNumber}: id, name, attr, type, cool, swGauge, brGauge, image are required keys.`
			)
			return
		}

		try {
			const attr = normalizeAttribute(attrInput)
			const type = normalizeType(typeInput)
			const cool = normalizeTextField(record.cool)
			const swGauge = normalizeTextField(record.swGauge)
			const brGauge = normalizeTextField(record.brGauge)
			const image = normalizeTextField(record.image)

			if (attr !== normalizeWhitespace(attrInput)) {
				normalizedAttrCount += 1
			}

			if (type !== normalizeWhitespace(typeInput)) {
				normalizedTypeCount += 1
			}

			if (seenIds.has(id)) {
				duplicateIds.add(id)
				return
			}

			seenIds.add(id)
			normalized.push({
				id,
				name,
				attr,
				type,
				cool,
				swGauge,
				brGauge,
				image,
			})
		} catch (error) {
			errors.push(`Row ${rowNumber}: ${error.message}`)
		}
	})

	if (duplicateIds.size > 0) {
		errors.push(
			`Duplicate skill IDs detected: ${Array.from(duplicateIds).join(', ')}`
		)
	}

	return {
		normalized,
		errors,
		stats: {
			total: records.length,
			valid: normalized.length,
			normalizedAttrCount,
			normalizedTypeCount,
		},
	}
}

async function authenticate() {
	const email = process.env.FIREBASE_AUTH_EMAIL || ''
	const password = process.env.FIREBASE_AUTH_PASSWORD || ''

	if (!email || !password) {
		throw new Error(
			'FIREBASE_AUTH_EMAIL and FIREBASE_AUTH_PASSWORD are required for Firebase operations.'
		)
	}

	const app = initializeApp(firebaseConfig, `skill-master-import-${Date.now()}`)
	const auth = getAuth(app)
	const db = getFirestore(app)
	const credential = await signInWithEmailAndPassword(auth, email, password)

	return { app, auth, db, user: credential.user }
}

async function fetchExistingSkillMaster(db) {
	const snapshot = await getDocs(collection(db, 'skill_master'))
	return new Map(
		snapshot.docs.map((snapshotDoc) => [
			snapshotDoc.id,
			{ id: snapshotDoc.id, ...snapshotDoc.data() },
		])
	)
}

async function fetchReferencedSkillIds(db) {
	const snapshot = await getDocs(collection(db, 'user_skills'))
	const ids = new Set()

	snapshot.docs.forEach((snapshotDoc) => {
		const ownedSkills = snapshotDoc.data()?.ownedSkills ?? []
		ownedSkills.forEach((ownedSkill) => {
			if (ownedSkill?.skillId) {
				ids.add(String(ownedSkill.skillId))
			}
		})
	})

	return ids
}

function diffSkillMaster(inputSkills, existingSkills) {
	const inserts = []
	const updates = []
	const unchanged = []
	const inputIds = new Set(inputSkills.map((skill) => skill.id))

	for (const skill of inputSkills) {
		const existing = existingSkills.get(skill.id)

		if (!existing) {
			inserts.push(skill)
			continue
		}

		if (
			existing.name === skill.name &&
			existing.attr === skill.attr &&
			existing.type === skill.type &&
			existing.cool === skill.cool &&
			existing.swGauge === skill.swGauge &&
			existing.brGauge === skill.brGauge &&
			existing.image === skill.image
		) {
			unchanged.push(skill)
			continue
		}

		updates.push(skill)
	}

	const missing = Array.from(existingSkills.keys()).filter((id) => !inputIds.has(id))

	return { inserts, updates, unchanged, missing }
}

async function applyChanges({
	db,
	authUid,
	inserts,
	updates,
	missing,
	pruneMissing,
	referencedSkillIds,
}) {
	const chunkSize = 400
	let deleted = 0
	const upserts = [...inserts, ...updates]
	const insertIds = new Set(inserts.map((skill) => skill.id))

	for (let index = 0; index < upserts.length; index += chunkSize) {
		const batch = writeBatch(db)
		const chunk = upserts.slice(index, index + chunkSize)

		chunk.forEach((skill) => {
			const skillRef = doc(db, 'skill_master', skill.id)
			const payload = {
				id: skill.id,
				name: skill.name,
				attr: skill.attr,
				type: skill.type,
				cool: skill.cool,
				swGauge: skill.swGauge,
				brGauge: skill.brGauge,
				image: skill.image,
				updatedAt: serverTimestamp(),
				updatedBy: authUid,
			}

			if (insertIds.has(skill.id)) {
				batch.set(skillRef, {
					...payload,
					createdAt: serverTimestamp(),
					createdBy: authUid,
				})
				return
			}

			batch.set(skillRef, payload, { merge: true })
		})

		await batch.commit()
	}

	if (pruneMissing && missing.length > 0) {
		const referencedMissing = missing.filter((id) => referencedSkillIds.has(id))
		if (referencedMissing.length > 0) {
			throw new Error(
				`Cannot prune skill_master documents referenced by user_skills: ${referencedMissing.slice(0, 20).join(', ')}`
			)
		}

		for (let index = 0; index < missing.length; index += chunkSize) {
			const batch = writeBatch(db)
			const chunk = missing.slice(index, index + chunkSize)
			chunk.forEach((skillId) => batch.delete(doc(db, 'skill_master', skillId)))
			await batch.commit()
			deleted += chunk.length
		}
	}

	return { deleted }
}

function printSummary({
	file,
	validationStats,
	diffStats,
	validateOnly,
	dryRun,
	pruneMissing,
}) {
	console.log(`Input file: ${file}`)
	console.log(`Valid rows: ${validationStats.valid}/${validationStats.total}`)
	console.log(`Normalized attrs: ${validationStats.normalizedAttrCount}`)
	console.log(`Normalized types: ${validationStats.normalizedTypeCount}`)

	if (diffStats) {
		console.log(`Insert: ${diffStats.inserts}`)
		console.log(`Update: ${diffStats.updates}`)
		console.log(`Unchanged: ${diffStats.unchanged}`)
		console.log(`Missing from input: ${diffStats.missing}`)
	}

	if (validateOnly) {
		console.log('Mode: validate-only')
	}

	if (dryRun) {
		console.log('Mode: dry-run')
	}

	if (pruneMissing) {
		console.log('Prune missing: enabled')
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2))

	if (args.help || !args.file) {
		console.log(usage)
		process.exit(args.help ? 0 : 1)
	}

	const records = await loadSource(args.file)
	const { normalized, errors, stats } = normalizeRecords(records)

	if (errors.length > 0) {
		errors.forEach((error) => console.error(error))
		process.exit(1)
	}

	if (args.validateOnly) {
		printSummary({
			file: args.file,
			validationStats: stats,
			diffStats: null,
			validateOnly: true,
			dryRun: false,
			pruneMissing: args.pruneMissing,
		})
		return
	}

	const { app, auth, db, user } = await authenticate()

	try {
		const existingSkills = await fetchExistingSkillMaster(db)
		const diff = diffSkillMaster(normalized, existingSkills)
		const referencedSkillIds = args.pruneMissing
			? await fetchReferencedSkillIds(db)
			: new Set()

		printSummary({
			file: args.file,
			validationStats: stats,
			diffStats: {
				inserts: diff.inserts.length,
				updates: diff.updates.length,
				unchanged: diff.unchanged.length,
				missing: diff.missing.length,
			},
			validateOnly: false,
			dryRun: args.dryRun,
			pruneMissing: args.pruneMissing,
		})

		if (args.dryRun) {
			return
		}

		const { deleted } = await applyChanges({
			db,
			authUid: user.uid,
			inserts: diff.inserts,
			updates: diff.updates,
			missing: diff.missing,
			pruneMissing: args.pruneMissing,
			referencedSkillIds,
		})

		console.log(
			`Applied skill_master changes. inserted=${diff.inserts.length}, updated=${diff.updates.length}, unchanged=${diff.unchanged.length}, deleted=${deleted}`
		)
	} finally {
		await signOut(auth)
		await deleteApp(app)
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
