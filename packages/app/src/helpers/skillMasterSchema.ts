import type { SkillMaster} from '@rm/types'
import { defaultSkillMaster } from '@rm/types'

type SkillTypeOption = SkillMaster['skillType']
type AttackTypeOption = SkillMaster['attackType']

// equipmentType の保存値は既存Firestoreデータに合わせて日本語のままにする。
// Storageのフォルダ名だけは既存のGCSフォルダ構成
// (gs://recordmanagements-756bf.appspot.com/skill-master/source-images/{英語名}/)
// に合わせる必要があるため、フォルダ名解決専用の英語キーを別途用意する
// (createSkillMasterImageStoragePath 参照)。
// バースト/フルバースト・フリーは現在使用実績がないため選択肢から除外している。
const legacyWeaponBases = [
  '片手直剣',
  '細剣',
  '棍棒',
  '短剣',
  '斧',
  '槍',
  '弓',
  '盾',
  'アビリティ'
] as const

export const skillElements = ['火', '水', '土', '聖', '闇', '風', '無'] as const
export const skillEquipmentTypes = legacyWeaponBases
export const skillTypeOptions = [
  '通常',
  'アビリティ',
  '覚醒',
  'アクセル',
  'MOD',
  'コネクト',
  'チェイン',
  'リンク',
  'バースト',
  'フルバースト'
] as const satisfies readonly SkillTypeOption[]
export const attackTypeOptions = [
  '斬',
  '突',
  '打'
] as const satisfies readonly AttackTypeOption[]

const elementAliasMap = new Map([
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
  ['colorless', '無']
])

const equipmentTypeAliasMap = new Map([
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
  ['ability', 'アビリティ']
])

// Storageのフォルダ名(既存のGCSフォルダ構成に合わせた英語キー)への変換専用マップ。
// equipmentType自体の保存値(日本語)には影響しない。
const equipmentTypeStorageFolderMap = new Map([
  ['片手直剣', 'sword'],
  ['細剣', 'rapier'],
  ['棍棒', 'club'],
  ['短剣', 'dagger'],
  ['斧', 'axe'],
  ['槍', 'spear'],
  ['弓', 'bow'],
  ['盾', 'shield'],
  ['アビリティ', 'ability']
])

const skillTypeAliasMap = new Map<string, SkillTypeOption>([
  ['', '通常'],
  ['normal', '通常'],
  ['base', '通常'],
  ['通常', '通常'],
  ['アビリティ', 'アビリティ'],
  ['ability', 'アビリティ'],
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
  ['フルバーストスキル', 'フルバースト']
])

const attackTypeAliasMap = new Map<string, AttackTypeOption>([
  ['斬', '斬'],
  ['slash', '斬'],
  ['突', '突'],
  ['pierce', '突'],
  ['打', '打'],
  ['strike', '打']
])

const rarityPattern = /(UR|SSR|SR|RRR|RR|R|N)/i
const rarityAliasMap = new Map<string, number>([
  ['N', 1],
  ['R', 2],
  ['RR', 3],
  ['RRR', 4],
  ['SR', 5],
  ['SSR', 6],
  ['UR', 7]
])

export function normalizeSkillMasterWhitespace(value: unknown) {
  return String(value ?? '')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeSkillMasterEffect(value: unknown) {
  return String(value ?? '')
    .replace(/\u3000/g, ' ') // 全角スペース → 半角スペース
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
}

function normalizeLookupKey(value: unknown) {
  return normalizeSkillMasterWhitespace(value)
    .toLowerCase()
    .replace(/[\s_()\-]/g, '')
}

function resolveAlias<T extends string>(
  value: unknown,
  aliasMap: Map<string, T>,
  fallback = ''
) {
  const raw = normalizeSkillMasterWhitespace(value)
  if (!raw) return fallback
  return aliasMap.get(normalizeLookupKey(raw)) ?? aliasMap.get(raw) ?? fallback
}

function parseLegacyTypeParts(typeValue: unknown) {
  const raw = normalizeSkillMasterWhitespace(typeValue)
    .replace(/（/g, '(')
    .replace(/）/g, ')')
  if (!raw) {
    return { equipmentType: '', skillType: '通常' as SkillTypeOption }
  }

  const match = raw.match(/^(.*?)(?:\((.+)\))?$/)
  const base = normalizeSkillMasterWhitespace(match?.[1] ?? raw)
  const variant = normalizeSkillMasterWhitespace(match?.[2] ?? '')

  return {
    equipmentType: resolveAlias(base, equipmentTypeAliasMap),
    skillType: resolveAlias(variant, skillTypeAliasMap, '通常')
  }
}

export function normalizeSkillMasterElement(value: unknown) {
  return resolveAlias(value, elementAliasMap)
}

export function normalizeSkillMasterEquipmentType(
  value: unknown,
  fallbackLegacyType = ''
) {
  const resolved = resolveAlias(value, equipmentTypeAliasMap)
  if (resolved) return resolved
  return parseLegacyTypeParts(fallbackLegacyType).equipmentType
}

export function normalizeSkillMasterSkillType(
  value: unknown,
  fallbackLegacyType = ''
) {
  const resolved = resolveAlias(value, skillTypeAliasMap)
  if (resolved) return resolved
  return parseLegacyTypeParts(fallbackLegacyType).skillType
}

export function inferAttackTypeFromEquipmentType(
  equipmentType: string
): AttackTypeOption | '' {
  if (['片手直剣', '短剣', '斧'].includes(equipmentType)) return '斬'
  if (['細剣', '槍', '弓'].includes(equipmentType)) return '突'
  if (['棍棒', '盾'].includes(equipmentType)) return '打'
  return ''
}

export function normalizeSkillMasterAttackType(
  value: unknown,
  fallbackEquipmentType = ''
) {
  const resolved = resolveAlias(value, attackTypeAliasMap)
  if (resolved) return resolved
  return inferAttackTypeFromEquipmentType(fallbackEquipmentType)
}

export function normalizeSkillMasterRarity(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const raw = normalizeSkillMasterWhitespace(value)
  if (!raw) return null

  const numeric = normalizeSkillMasterNumber(raw)
  if (numeric !== null) {
    return numeric
  }

  const matched = raw.match(rarityPattern)
  return matched ? rarityAliasMap.get(matched[1].toUpperCase()) ?? null : null
}

export function normalizeSkillMasterNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const raw = normalizeSkillMasterWhitespace(value)
  if (!raw) return null

  const normalized = raw
    .replace(/,/g, '')
    .replace(/^\+/, '')
    .replace(/秒$/u, '')
    .replace(/s$/iu, '')
  const matched = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!matched) return null

  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : null
}

export function extractCharacterNameFromSkillName(value: string) {
  const normalized = normalizeSkillMasterWhitespace(value)
  const match = normalized.match(/】\s*(.+)$/u)
  return normalizeSkillMasterWhitespace(match?.[1] ?? '')
}

export function normalizeSkillMasterRecord(
  record: Partial<Record<string, unknown>>
) {
  const fallback = defaultSkillMaster()
  const legacyType = normalizeSkillMasterWhitespace(record.type)
  const equipmentType = normalizeSkillMasterEquipmentType(
    record.equipmentType,
    legacyType
  )
  const skillType =
    equipmentType === 'アビリティ'
      ? normalizeSkillMasterSkillType(
          record.skillType || 'アビリティ',
          legacyType
        )
      : normalizeSkillMasterSkillType(record.skillType, legacyType)

  return {
    ...fallback,
    ...record,
    id: normalizeSkillMasterWhitespace(record.id ?? fallback.id),
    name: normalizeSkillMasterWhitespace(record.name ?? fallback.name),
    characterName:
      normalizeSkillMasterWhitespace(record.characterName) ||
      extractCharacterNameFromSkillName(
        normalizeSkillMasterWhitespace(record.name ?? fallback.name)
      ),
    rarity: normalizeSkillMasterRarity(record.rarity),
    cost: normalizeSkillMasterNumber(record.cost),
    equipmentType,
    sp: normalizeSkillMasterNumber(record.sp),
    element: normalizeSkillMasterElement(record.element ?? record.attr),
    skillType,
    attackType: normalizeSkillMasterAttackType(
      record.attackType,
      equipmentType
    ),
    breakGauge: normalizeSkillMasterNumber(record.breakGauge ?? record.brGauge),
    switchGauge: normalizeSkillMasterNumber(
      record.switchGauge ?? record.swGauge
    ),
    cooldown: normalizeSkillMasterNumber(record.cooldown ?? record.cool),
    skillName: normalizeSkillMasterWhitespace(record.skillName),
    effect: normalizeSkillMasterEffect(record.effect),
    image: normalizeSkillMasterWhitespace(record.image ?? fallback.image),
    imageThumb: normalizeSkillMasterWhitespace(
      record.imageThumb ?? fallback.imageThumb
    )
  } satisfies SkillMaster
}

export function buildSkillMasterSearchText(skill: SkillMaster) {
  return [
    skill.id,
    skill.name,
    skill.characterName,
    extractCharacterNameFromSkillName(skill.name),
    skill.skillName,
    skill.effect,
    skill.rarity,
    skill.element,
    skill.equipmentType,
    skill.skillType,
    skill.attackType
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// 管理画面からのアップロードは装備種別(equipmentType)ごとにフォルダを分ける。
// フォルダ名は既存のGCS構成(ability/axe/bow/club/dagger/rapier/shield/spear/sword)
// に合わせる必要があるため、equipmentTypeStorageFolderMapで英語キーに変換する。
// 未知の値(旧データ等)は'misc'フォルダにフォールバックする。
const SKILL_MASTER_IMAGE_STORAGE_ROOT = 'skill-master/source-images'

export function resolveSkillMasterStorageFolder(equipmentType: string) {
  const normalized = normalizeSkillMasterEquipmentType(equipmentType)
  return equipmentTypeStorageFolderMap.get(normalized) ?? 'misc'
}

export function createSkillMasterImageStoragePath(equipmentType: string) {
  return `${SKILL_MASTER_IMAGE_STORAGE_ROOT}/${resolveSkillMasterStorageFolder(
    equipmentType
  )}`
}

// 同じ装備種別フォルダに複数スキルの画像が混在するため、ファイル名にskillIdを
// 埋め込んで一意にする(Cloud Functions側もこの命名規則でskillIdを復元する)。
export function createSkillMasterSourceFileName(skillId: string, file: File) {
  const extension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : '.png'
  return `${skillId}-source${extension}`
}

export function createSkillMasterThumbnailFileName(skillId: string) {
  return `${skillId}-thumb.webp`
}
