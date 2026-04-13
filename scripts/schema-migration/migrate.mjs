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
  npm run schema-migration:migrate -- --validate-only --mapping-file ./secure/migration-map.json
  FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run schema-migration:migrate -- --dry-run --mapping-file ./secure/migration-map.json --user-ids uid1,uid2
  FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run schema-migration:migrate -- --apply --mapping-file ./secure/migration-map.json --user-ids uid1,uid2
  FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run schema-migration:migrate -- --apply --mapping-file ./secure/migration-map.json

Options:
  --mapping-file <path>   Optional. JSON file that maps legacy skill buckets to skill_master IDs.
  --user-ids <uids>       Optional. Comma-separated legacy user IDs to migrate first.
  --validate-only         Validate only the mapping file format. No Firebase access.
  --dry-run               Authenticate and diff Firestore without writing.
  --apply                 Required to write to Firestore.
  --help                  Show this help.

Environment variables for Firebase operations:
  FIREBASE_AUTH_EMAIL
  FIREBASE_AUTH_PASSWORD
`

const legacySkillBuckets = [
	'sword',
	'rapier',
	'club',
	'dagger',
	'axe',
	'spear',
	'bow',
	'shield',
	'ability',
	'abilityRecollection',
	'abilityAccele',
	'weaponRecollection',
	'weaponMod',
	'weaponConnect',
	'weaponAccele',
	'burst_FullBurst',
	'free',
]

const proficiencySources = ['sword', 'rapier', 'club', 'dagger', 'axe', 'spear', 'bow', 'shield']
const appRoles = ['admin', 'guild_admin', 'member']
const userSituations = ['現役', '隠居', '引退', '']

const legacySkillBucketSet = new Set(legacySkillBuckets)
const proficiencySourceSet = new Set(proficiencySources)
const appRoleSet = new Set(appRoles)
const userSituationSet = new Set(userSituations)

function parseArgs(argv) {
	const args = {
		mappingFile: '',
		userIds: [],
		validateOnly: false,
		dryRun: false,
		apply: false,
		help: false,
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]

		if (arg === '--mapping-file') {
			const nextValue = argv[index + 1]
			if (!nextValue || nextValue.startsWith('--')) {
				throw new Error('--mapping-file requires a value.')
			}

			args.mappingFile = nextValue
			index += 1
			continue
		}

		if (arg === '--user-ids') {
			const nextValue = argv[index + 1]
			if (!nextValue || nextValue.startsWith('--')) {
				throw new Error('--user-ids requires a comma-separated value.')
			}

			args.userIds = splitCommaList(nextValue)
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

		if (arg === '--apply') {
			args.apply = true
			continue
		}

		if (arg === '--help' || arg === '-h') {
			args.help = true
			continue
		}

		throw new Error(`Unknown argument: ${arg}`)
	}

	return args
}

function splitCommaList(value) {
	return String(value || '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
}

function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : ''
}

function normalizeNonNegativeInteger(value) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 0
	}

	return Math.max(0, Math.round(value))
}

function normalizeArrayOfStrings(value) {
	if (!Array.isArray(value)) {
		return []
	}

	return value
		.map((item) => normalizeString(item))
		.filter(Boolean)
}

function normalizeUserSituation(value) {
	const normalizedValue = normalizeString(value)
	return userSituationSet.has(normalizedValue) ? normalizedValue : '現役'
}

function normalizeOwnedSkills(value) {
	if (!Array.isArray(value)) {
		return []
	}

	const seen = new Set()
	return value
		.map((item) => {
			if (!item || typeof item !== 'object') {
				return null
			}

			const skillId = normalizeString(item.skillId)
			if (!skillId) {
				return null
			}

			return {
				skillId,
				level: normalizeNonNegativeInteger(item.level),
			}
		})
		.filter((item) => item !== null)
		.filter((item) => {
			if (seen.has(item.skillId)) {
				return false
			}

			seen.add(item.skillId)
			return true
		})
}

function normalizeLegacySkillRecord(value) {
	const payload = value && typeof value === 'object' ? value : {}
	return Object.fromEntries(
		legacySkillBuckets.map((bucket) => [bucket, normalizeArrayOfStrings(payload[bucket])])
	)
}

function normalizeLegacyProficiency(value) {
	const payload = value && typeof value === 'object' ? value : {}
	return Object.fromEntries(
		proficiencySources.map((bucket) => [
			bucket,
			normalizeNonNegativeInteger(payload[bucket]),
		])
	)
}

function normalizeLegacyUser(rawDoc, userId) {
	const contact = rawDoc?.contact && typeof rawDoc.contact === 'object' ? rawDoc.contact : {}

	return {
		...rawDoc,
		id: userId,
		charaName: normalizeString(rawDoc?.charaName),
		charaNameKana: normalizeString(rawDoc?.charaNameKana),
		guildId: normalizeString(rawDoc?.guildId),
		affiliationDate: rawDoc?.affiliationDate || null,
		affiliationNum: normalizeNonNegativeInteger(rawDoc?.affiliationNum),
		situation: normalizeUserSituation(rawDoc?.situation),
		gameStartDateAt: rawDoc?.gameStartDateAt || null,
		role: normalizeString(rawDoc?.role),
		contact: {
			email: normalizeString(contact.email),
			phone: normalizeString(contact.phone),
		},
		birthDateAt: rawDoc?.birthDateAt || null,
		imageUrls: normalizeArrayOfStrings(rawDoc?.imageUrls),
		skillRecord: normalizeLegacySkillRecord(rawDoc?.skillRecord),
		proficiencyLevel: normalizeLegacyProficiency(rawDoc?.proficiencyLevel),
	}
}

function normalizeExistingAppUser(rawDoc, userId) {
	if (!rawDoc) {
		return null
	}

	const role = appRoleSet.has(rawDoc.role) ? rawDoc.role : 'member'

	return {
		...rawDoc,
		id: userId,
		uid: normalizeString(rawDoc.uid) || userId,
		email: normalizeString(rawDoc.email),
		displayName: normalizeString(rawDoc.displayName),
		displayNameKana: normalizeString(rawDoc.displayNameKana),
		guildId: normalizeString(rawDoc.guildId),
		affiliationDate: rawDoc?.affiliationDate || null,
		affiliationNum: normalizeNonNegativeInteger(rawDoc?.affiliationNum),
		situation: normalizeUserSituation(rawDoc?.situation),
		gameStartDateAt: rawDoc?.gameStartDateAt || null,
		birthDateAt: rawDoc?.birthDateAt || null,
		phone: normalizeString(rawDoc?.phone),
		imageUrls: normalizeArrayOfStrings(rawDoc?.imageUrls),
		role,
	}
}

function normalizeExistingUserSkill(rawDoc, userId) {
	if (!rawDoc) {
		return null
	}

	return {
		...rawDoc,
		id: userId,
		userId: normalizeString(rawDoc.userId) || userId,
		ownedSkills: normalizeOwnedSkills(rawDoc.ownedSkills),
	}
}

function mapLegacyRoleToAppRole(role) {
	return normalizeString(role) === '管理者' ? 'admin' : 'member'
}

function choosePreferredString(primaryValue, fallbackValue) {
	return normalizeString(primaryValue) || normalizeString(fallbackValue)
}

function choosePreferredNumber(primaryValue, fallbackValue) {
	if (typeof primaryValue === 'number' && Number.isFinite(primaryValue) && primaryValue > 0) {
		return Math.max(0, Math.round(primaryValue))
	}

	return normalizeNonNegativeInteger(fallbackValue)
}

function choosePreferredTimestamp(primaryValue, fallbackValue) {
	return primaryValue || fallbackValue || null
}

function choosePreferredStringArray(primaryValue, fallbackValue) {
	const primary = normalizeArrayOfStrings(primaryValue)
	if (primary.length > 0) {
		return primary
	}

	return normalizeArrayOfStrings(fallbackValue)
}

function compareOptionalTimestamp(a, b) {
	if (a === null && b === null) {
		return true
	}

	if (!a && !b) {
		return true
	}

	const resolveComparableValue = (value) => {
		if (!value) {
			return null
		}

		if (value instanceof Date) {
			return value.getTime()
		}

		if (typeof value.toMillis === 'function') {
			return value.toMillis()
		}

		return String(value)
	}

	return resolveComparableValue(a) === resolveComparableValue(b)
}

function compareStringArrays(a, b) {
	if (a.length !== b.length) {
		return false
	}

	return a.every((value, index) => value === b[index])
}

function getLegacyBucketsWithImages(legacyUser) {
	return legacySkillBuckets.filter((bucket) => legacyUser.skillRecord[bucket].length > 0)
}

function extractLegacyImageUrls(legacyUser) {
	const primary = legacyUser.imageUrls.length > 0
		? legacyUser.imageUrls
		: legacySkillBuckets.flatMap((bucket) => legacyUser.skillRecord[bucket])

	const seen = new Set()
	return primary.filter((url) => {
		if (!url || seen.has(url)) {
			return false
		}

		seen.add(url)
		return true
	})
}

function compareAppUsers(a, b) {
	return (
		a.uid === b.uid &&
		a.email === b.email &&
		a.displayName === b.displayName &&
		a.displayNameKana === b.displayNameKana &&
		a.guildId === b.guildId &&
		a.affiliationNum === b.affiliationNum &&
		a.situation === b.situation &&
		a.phone === b.phone &&
		compareOptionalTimestamp(a.affiliationDate, b.affiliationDate) &&
		compareOptionalTimestamp(a.gameStartDateAt, b.gameStartDateAt) &&
		compareOptionalTimestamp(a.birthDateAt, b.birthDateAt) &&
		compareStringArrays(a.imageUrls, b.imageUrls) &&
		a.role === b.role
	)
}

function compareOwnedSkills(a, b) {
	if (a.length !== b.length) {
		return false
	}

	return a.every(
		(skill, index) =>
			skill.skillId === b[index]?.skillId && skill.level === b[index]?.level
	)
}

function normalizeBucketMappingEntry(entry, userId, bucket, entryIndex) {
	if (typeof entry === 'string') {
		const skillId = normalizeString(entry)
		if (!skillId) {
			throw new Error(
				`users.${userId}.bucketMappings.${bucket}[${entryIndex}] must not be empty.`
			)
		}

		return {
			skillId,
			level: null,
			levelSource: null,
		}
	}

	if (!entry || typeof entry !== 'object') {
		throw new Error(
			`users.${userId}.bucketMappings.${bucket}[${entryIndex}] must be a string or object.`
		)
	}

	const skillId = normalizeString(entry.skillId)
	if (!skillId) {
		throw new Error(
			`users.${userId}.bucketMappings.${bucket}[${entryIndex}].skillId is required.`
		)
	}

	const normalizedEntry = {
		skillId,
		level: null,
		levelSource: null,
	}

	if (entry.level !== undefined) {
		if (typeof entry.level !== 'number' || !Number.isFinite(entry.level) || entry.level < 0) {
			throw new Error(
				`users.${userId}.bucketMappings.${bucket}[${entryIndex}].level must be a non-negative number.`
			)
		}

		normalizedEntry.level = Math.round(entry.level)
	}

	if (entry.levelSource !== undefined) {
		const levelSource = normalizeString(entry.levelSource)
		if (!proficiencySourceSet.has(levelSource)) {
			throw new Error(
				`users.${userId}.bucketMappings.${bucket}[${entryIndex}].levelSource must be one of: ${proficiencySources.join(', ')}`
			)
		}

		normalizedEntry.levelSource = levelSource
	}

	return normalizedEntry
}

async function loadMappingFile(filePath) {
	if (!filePath) {
		return {
			filePath: '',
			roleOverrides: new Map(),
			userMappings: new Map(),
			stats: {
				roleOverrideCount: 0,
				mappedUsers: 0,
				mappedSkills: 0,
			},
		}
	}

	const absolutePath = path.resolve(process.cwd(), filePath)
	const rawContent = await fs.readFile(absolutePath, 'utf8')
	const parsed = JSON.parse(rawContent)
	const roleOverridesRaw =
		parsed?.roleOverrides && typeof parsed.roleOverrides === 'object'
			? parsed.roleOverrides
			: {}
	const usersRaw = parsed?.users && typeof parsed.users === 'object' ? parsed.users : {}

	const roleOverrides = new Map()
	for (const [userIdRaw, roleRaw] of Object.entries(roleOverridesRaw)) {
		const userId = normalizeString(userIdRaw)
		const role = normalizeString(roleRaw)

		if (!userId) {
			throw new Error('roleOverrides contains an empty user ID.')
		}

		if (!appRoleSet.has(role)) {
			throw new Error(
				`roleOverrides.${userId} must be one of: ${appRoles.join(', ')}`
			)
		}

		roleOverrides.set(userId, role)
	}

	const userMappings = new Map()
	let mappedSkills = 0

	for (const [userIdRaw, userMappingRaw] of Object.entries(usersRaw)) {
		const userId = normalizeString(userIdRaw)
		if (!userId) {
			throw new Error('users contains an empty user ID.')
		}

		const bucketMappingsRaw =
			userMappingRaw?.bucketMappings && typeof userMappingRaw.bucketMappings === 'object'
				? userMappingRaw.bucketMappings
				: {}

		const bucketMappings = new Map()

		for (const [bucketRaw, entriesRaw] of Object.entries(bucketMappingsRaw)) {
			const bucket = normalizeString(bucketRaw)
			if (!legacySkillBucketSet.has(bucket)) {
				throw new Error(
					`users.${userId}.bucketMappings.${bucket} is not a supported legacy bucket.`
				)
			}

			if (!Array.isArray(entriesRaw)) {
				throw new Error(
					`users.${userId}.bucketMappings.${bucket} must be an array.`
				)
			}

			if (entriesRaw.length === 0) {
				throw new Error(
					`users.${userId}.bucketMappings.${bucket} must contain at least one skill mapping.`
				)
			}

			const entries = entriesRaw.map((entry, index) =>
				normalizeBucketMappingEntry(entry, userId, bucket, index)
			)
			mappedSkills += entries.length
			bucketMappings.set(bucket, entries)
		}

		userMappings.set(userId, {
			bucketMappings,
		})
	}

	return {
		filePath: absolutePath,
		roleOverrides,
		userMappings,
		stats: {
			roleOverrideCount: roleOverrides.size,
			mappedUsers: userMappings.size,
			mappedSkills,
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

	const app = initializeApp(firebaseConfig, `schema-migration-${Date.now()}`)
	const auth = getAuth(app)
	const db = getFirestore(app)
	const credential = await signInWithEmailAndPassword(auth, email, password)

	return { app, auth, db, user: credential.user }
}

async function fetchCollectionMap(db, collectionName) {
	const snapshot = await getDocs(collection(db, collectionName))
	return new Map(
		snapshot.docs.map((snapshotDoc) => [
			snapshotDoc.id,
			{ id: snapshotDoc.id, ...snapshotDoc.data() },
		])
	)
}

function resolveOwnedSkillLevel(entry, bucket, legacyUser) {
	if (entry.level !== null) {
		return entry.level
	}

	if (entry.levelSource) {
		return legacyUser.proficiencyLevel[entry.levelSource] ?? 0
	}

	if (proficiencySourceSet.has(bucket)) {
		return legacyUser.proficiencyLevel[bucket] ?? 0
	}

	return 0
}

function buildMappedOwnedSkills({
	userId,
	legacyUser,
	userMapping,
	skillMasterIds,
}) {
	const mappedOwnedSkills = []
	const errors = []
	const warnings = []
	const seen = new Set()
	const bucketMappings = userMapping?.bucketMappings ?? new Map()
	const legacyBucketsWithImages = getLegacyBucketsWithImages(legacyUser)

	for (const [bucket, entries] of bucketMappings.entries()) {
		if (!legacyBucketsWithImages.includes(bucket)) {
			warnings.push(
				`${userId}: bucketMappings.${bucket} is provided, but legacy skillRecord.${bucket} has no images.`
			)
		}

		entries.forEach((entry) => {
			if (!skillMasterIds.has(entry.skillId)) {
				errors.push(
					`${userId}: skill_master "${entry.skillId}" referenced from bucketMappings.${bucket} does not exist.`
				)
				return
			}

			if (seen.has(entry.skillId)) {
				errors.push(
					`${userId}: duplicate skillId "${entry.skillId}" found across bucket mappings.`
				)
				return
			}

			seen.add(entry.skillId)
			mappedOwnedSkills.push({
				skillId: entry.skillId,
				level: resolveOwnedSkillLevel(entry, bucket, legacyUser),
			})
		})
	}

	return { mappedOwnedSkills, errors, warnings }
}

function mergeOwnedSkills(existingOwnedSkills, mappedOwnedSkills) {
	const merged = [...existingOwnedSkills]
	const seen = new Set(existingOwnedSkills.map((skill) => skill.skillId))
	let appended = 0

	mappedOwnedSkills.forEach((skill) => {
		if (seen.has(skill.skillId)) {
			return
		}

		seen.add(skill.skillId)
		merged.push(skill)
		appended += 1
	})

	return { merged, appended }
}

function buildUserPlan({
	legacyUser,
	existingAppUser,
	existingUserSkill,
	userMapping,
	roleOverride,
	guildIds,
	skillMasterIds,
}) {
	const userId = legacyUser.id
	const errors = []
	const warnings = []
	const legacyBucketsWithImages = getLegacyBucketsWithImages(legacyUser)
	const legacyImageUrls = extractLegacyImageUrls(legacyUser)

	const nextAppUser = {
		id: userId,
		uid: existingAppUser?.uid || userId,
		email: choosePreferredString(existingAppUser?.email, legacyUser.contact.email),
		displayName: choosePreferredString(
			existingAppUser?.displayName,
			legacyUser.charaName
		),
		displayNameKana: choosePreferredString(
			existingAppUser?.displayNameKana,
			legacyUser.charaNameKana
		),
		guildId: choosePreferredString(existingAppUser?.guildId, legacyUser.guildId),
		affiliationDate: choosePreferredTimestamp(
			existingAppUser?.affiliationDate,
			legacyUser.affiliationDate
		),
		affiliationNum: choosePreferredNumber(
			existingAppUser?.affiliationNum,
			legacyUser.affiliationNum
		),
		situation: choosePreferredString(existingAppUser?.situation, legacyUser.situation) || '現役',
		gameStartDateAt: choosePreferredTimestamp(
			existingAppUser?.gameStartDateAt,
			legacyUser.gameStartDateAt
		),
		birthDateAt: choosePreferredTimestamp(
			existingAppUser?.birthDateAt,
			legacyUser.birthDateAt
		),
		phone: choosePreferredString(existingAppUser?.phone, legacyUser.contact.phone),
		imageUrls: choosePreferredStringArray(existingAppUser?.imageUrls, legacyImageUrls),
		role:
			roleOverride ||
			existingAppUser?.role ||
			mapLegacyRoleToAppRole(legacyUser.role),
	}

	if (nextAppUser.guildId && !guildIds.has(nextAppUser.guildId)) {
		errors.push(`${userId}: guildId "${nextAppUser.guildId}" does not exist in guild collection.`)
	}

	const { mappedOwnedSkills, errors: mappingErrors, warnings: mappingWarnings } =
		buildMappedOwnedSkills({
			userId,
			legacyUser,
			userMapping,
			skillMasterIds,
		})

	errors.push(...mappingErrors)
	warnings.push(...mappingWarnings)

	const existingOwnedSkills = existingUserSkill?.ownedSkills ?? []
	const bucketCoverage = userMapping?.bucketMappings
		? new Set(userMapping.bucketMappings.keys())
		: new Set()
	const uncoveredBuckets = legacyBucketsWithImages.filter((bucket) => !bucketCoverage.has(bucket))

	if (existingOwnedSkills.length === 0 && uncoveredBuckets.length > 0) {
		errors.push(
			`${userId}: legacy skillRecord buckets [${uncoveredBuckets.join(', ')}] have images but no mapping and no existing user_skills.`
		)
	} else if (existingOwnedSkills.length > 0 && uncoveredBuckets.length > 0) {
		warnings.push(
			`${userId}: legacy skillRecord buckets [${uncoveredBuckets.join(', ')}] are not mapped, so existing user_skills is treated as the source of truth.`
		)
	}

	const { merged: mergedOwnedSkills, appended } = mergeOwnedSkills(
		existingOwnedSkills,
		mappedOwnedSkills
	)

	const nextUserSkill =
		existingUserSkill || mergedOwnedSkills.length > 0
			? {
					id: userId,
					userId,
					ownedSkills: mergedOwnedSkills,
				}
			: null

	const appUserChange =
		existingAppUser === null
			? 'insert'
			: compareAppUsers(existingAppUser, nextAppUser)
				? 'unchanged'
				: 'update'

	let userSkillChange = 'skip'
	if (nextUserSkill && existingUserSkill === null) {
		userSkillChange = 'insert'
	} else if (nextUserSkill && existingUserSkill) {
		userSkillChange = compareOwnedSkills(existingOwnedSkills, nextUserSkill.ownedSkills)
			? 'unchanged'
			: 'update'
	}

	return {
		userId,
		legacyUser,
		existingAppUser,
		existingUserSkill,
		nextAppUser,
		nextUserSkill,
		appUserChange,
		userSkillChange,
		legacyBucketsWithImages,
		legacyImageUrls,
		appendedOwnedSkills: appended,
		errors,
		warnings,
	}
}

function createAppUserPayload(plan, authUid) {
	const basePayload = {
		id: plan.userId,
		uid: plan.nextAppUser.uid,
		email: plan.nextAppUser.email,
		displayName: plan.nextAppUser.displayName,
		displayNameKana: plan.nextAppUser.displayNameKana,
		guildId: plan.nextAppUser.guildId,
		affiliationDate: plan.nextAppUser.affiliationDate,
		affiliationNum: plan.nextAppUser.affiliationNum,
		situation: plan.nextAppUser.situation,
		gameStartDateAt: plan.nextAppUser.gameStartDateAt,
		birthDateAt: plan.nextAppUser.birthDateAt,
		phone: plan.nextAppUser.phone,
		imageUrls: plan.nextAppUser.imageUrls,
		role: plan.nextAppUser.role,
		updatedAt: serverTimestamp(),
		updatedBy: authUid,
	}

	if (plan.appUserChange === 'insert') {
		return {
			...basePayload,
			createdAt: plan.legacyUser.createdAt || serverTimestamp(),
			createdBy: normalizeString(plan.legacyUser.createdBy) || authUid,
		}
	}

	return basePayload
}

function createUserSkillPayload(plan, authUid) {
	const basePayload = {
		id: plan.userId,
		userId: plan.userId,
		ownedSkills: plan.nextUserSkill?.ownedSkills ?? [],
		updatedAt: serverTimestamp(),
		updatedBy: authUid,
	}

	if (plan.userSkillChange === 'insert') {
		return {
			...basePayload,
			createdAt: plan.legacyUser.createdAt || serverTimestamp(),
			createdBy: normalizeString(plan.legacyUser.createdBy) || authUid,
		}
	}

	return basePayload
}

async function commitWrites(db, collectionName, writePlans) {
	const chunkSize = 200

	for (let index = 0; index < writePlans.length; index += chunkSize) {
		const batch = writeBatch(db)
		const chunk = writePlans.slice(index, index + chunkSize)

		chunk.forEach((writePlan) => {
			const ref = doc(db, collectionName, writePlan.id)
			if (writePlan.insert) {
				batch.set(ref, writePlan.payload)
				return
			}

			batch.set(ref, writePlan.payload, { merge: true })
		})

		await batch.commit()
	}
}

function printLimitedLines(title, lines, printer = console.log) {
	if (lines.length === 0) {
		return
	}

	const limit = 40
	printer(`\n${title}:`)
	lines.slice(0, limit).forEach((line) => printer(`- ${line}`))
	if (lines.length > limit) {
		printer(`- ...and ${lines.length - limit} more`)
	}
}

function summarizePlans(plans) {
	const summary = {
		selectedLegacyUsers: plans.length,
		appUsersInsert: 0,
		appUsersUpdate: 0,
		appUsersUnchanged: 0,
		userSkillsInsert: 0,
		userSkillsUpdate: 0,
		userSkillsUnchanged: 0,
		userSkillsSkip: 0,
		appendedOwnedSkills: 0,
		migratedImageRefs: 0,
		legacyBucketsReviewed: 0,
		errors: [],
		warnings: [],
	}

	plans.forEach((plan) => {
		if (plan.appUserChange === 'insert') summary.appUsersInsert += 1
		if (plan.appUserChange === 'update') summary.appUsersUpdate += 1
		if (plan.appUserChange === 'unchanged') summary.appUsersUnchanged += 1
		if (plan.userSkillChange === 'insert') summary.userSkillsInsert += 1
		if (plan.userSkillChange === 'update') summary.userSkillsUpdate += 1
		if (plan.userSkillChange === 'unchanged') summary.userSkillsUnchanged += 1
		if (plan.userSkillChange === 'skip') summary.userSkillsSkip += 1
		summary.appendedOwnedSkills += plan.appendedOwnedSkills
		summary.migratedImageRefs += plan.nextAppUser.imageUrls.length
		summary.legacyBucketsReviewed += plan.legacyBucketsWithImages.length
		summary.errors.push(...plan.errors)
		summary.warnings.push(...plan.warnings)
	})

	return summary
}

function printSummary({ args, mapping, summary }) {
	console.log(`Mapping file: ${mapping.filePath || '(none)'}`)
	console.log(`Role overrides: ${mapping.stats.roleOverrideCount}`)
	console.log(`Mapped users in file: ${mapping.stats.mappedUsers}`)
	console.log(`Mapped skill references in file: ${mapping.stats.mappedSkills}`)
	console.log(`Selected legacy users: ${summary.selectedLegacyUsers}`)
	console.log(
		`users => insert:${summary.appUsersInsert} update:${summary.appUsersUpdate} unchanged:${summary.appUsersUnchanged}`
	)
	console.log(
		`user_skills => insert:${summary.userSkillsInsert} update:${summary.userSkillsUpdate} unchanged:${summary.userSkillsUnchanged} skip:${summary.userSkillsSkip}`
	)
	console.log(`Backfilled ownedSkills: ${summary.appendedOwnedSkills}`)
	console.log(`Backfilled users.imageUrls: ${summary.migratedImageRefs}`)
	console.log(`Legacy buckets reviewed: ${summary.legacyBucketsReviewed}`)

	if (args.validateOnly) {
		console.log('Mode: validate-only')
	}

	if (args.dryRun) {
		console.log('Mode: dry-run')
	}

	if (args.apply) {
		console.log('Mode: apply')
	}

	if (args.userIds.length > 0) {
		console.log(`Target users: ${args.userIds.join(', ')}`)
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2))

	if (args.help) {
		console.log(usage)
		return
	}

	if (args.validateOnly && args.dryRun) {
		throw new Error('--validate-only and --dry-run cannot be used together.')
	}

	if (args.validateOnly && args.apply) {
		throw new Error('--validate-only and --apply cannot be used together.')
	}

	if (args.dryRun && args.apply) {
		throw new Error('--dry-run and --apply cannot be used together.')
	}

	if (!args.validateOnly && !args.dryRun && !args.apply) {
		throw new Error('Write mode requires an explicit --apply flag.')
	}

	const mapping = await loadMappingFile(args.mappingFile)

	if (args.validateOnly) {
		printSummary({
			args,
			mapping,
			summary: {
				selectedLegacyUsers: 0,
				appUsersInsert: 0,
				appUsersUpdate: 0,
				appUsersUnchanged: 0,
				userSkillsInsert: 0,
				userSkillsUpdate: 0,
				userSkillsUnchanged: 0,
				userSkillsSkip: 0,
				appendedOwnedSkills: 0,
				migratedImageRefs: 0,
				legacyBucketsReviewed: 0,
				errors: [],
				warnings: [],
			},
		})
		console.log('Mapping file structure is valid.')
		return
	}

	const { app, auth, db, user } = await authenticate()

	try {
		const [legacyUsersMap, appUsersMap, userSkillsMap, guildsMap, skillMasterMap] =
			await Promise.all([
				fetchCollectionMap(db, 'user'),
				fetchCollectionMap(db, 'users'),
				fetchCollectionMap(db, 'user_skills'),
				fetchCollectionMap(db, 'guild'),
				fetchCollectionMap(db, 'skill_master'),
			])

		const selectedUserIds =
			args.userIds.length > 0
				? args.userIds
				: Array.from(legacyUsersMap.keys()).sort((a, b) => a.localeCompare(b, 'ja'))

		const unknownRequestedUserIds = selectedUserIds.filter((userId) => !legacyUsersMap.has(userId))
		if (unknownRequestedUserIds.length > 0) {
			throw new Error(
				`Unknown legacy user IDs: ${unknownRequestedUserIds.join(', ')}`
			)
		}

		const guildIds = new Set(guildsMap.keys())
		const skillMasterIds = new Set(skillMasterMap.keys())
		const plans = selectedUserIds.map((userId) =>
			buildUserPlan({
				legacyUser: normalizeLegacyUser(legacyUsersMap.get(userId), userId),
				existingAppUser: normalizeExistingAppUser(appUsersMap.get(userId), userId),
				existingUserSkill: normalizeExistingUserSkill(userSkillsMap.get(userId), userId),
				userMapping: mapping.userMappings.get(userId) || null,
				roleOverride: mapping.roleOverrides.get(userId) || '',
				guildIds,
				skillMasterIds,
			})
		)

		const summary = summarizePlans(plans)
		printSummary({ args, mapping, summary })
		printLimitedLines('Warnings', summary.warnings, console.warn)
		printLimitedLines('Blocking issues', summary.errors, console.error)

		if (summary.errors.length > 0) {
			process.exitCode = 1
			return
		}

		if (args.dryRun) {
			return
		}

		const appUserWrites = plans
			.filter((plan) => plan.appUserChange === 'insert' || plan.appUserChange === 'update')
			.map((plan) => ({
				id: plan.userId,
				insert: plan.appUserChange === 'insert',
				payload: createAppUserPayload(plan, user.uid),
			}))

		const userSkillWrites = plans
			.filter((plan) => plan.userSkillChange === 'insert' || plan.userSkillChange === 'update')
			.map((plan) => ({
				id: plan.userId,
				insert: plan.userSkillChange === 'insert',
				payload: createUserSkillPayload(plan, user.uid),
			}))

		await commitWrites(db, 'users', appUserWrites)
		await commitWrites(db, 'user_skills', userSkillWrites)

		console.log(
			`Applied migration. users=${appUserWrites.length}, user_skills=${userSkillWrites.length}, users_image_refs=${summary.migratedImageRefs}`
		)
	} finally {
		await signOut(auth)
		await deleteApp(app)
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
