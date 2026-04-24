import { SkillMaster } from '@rm/types'
import { CsvRecord, normalizeCsvWhitespace } from './csv'

export type SkillMasterImportPayload = Pick<
  SkillMaster,
  'id' | 'name' | 'attr' | 'type' | 'cool' | 'swGauge' | 'brGauge' | 'image'
> & {
  rowNumber: number
}

export type SkillMasterImportChangeType = 'insert' | 'update' | 'unchanged'

const canonicalAttributes = ['火', '水', '土', '聖', '闇', '風', '無']
const weaponBases = ['片手直剣', '細剣', '棍棒', '短剣', '斧', '槍', '弓', '盾']
const weaponVariants = ['', '覚醒', 'アクセル', 'MOD', 'コネクト', 'チェイン', 'リンク']
const abilityVariants = ['', '覚醒', 'アクセル', 'チェイン', 'リンク']
const legacyExtraTypes = ['バースト/フルバースト', 'フリー']
const canonicalTypes = [
  ...weaponBases.flatMap((base) =>
    weaponVariants.map((variant) => (variant === '' ? base : `${base}(${variant})`))
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

function normalizeLookupKey(value: unknown) {
  return normalizeCsvWhitespace(value).toLowerCase().replace(/[\s_()-]/g, '')
}

function normalizeAttribute(value: unknown) {
  const raw = normalizeCsvWhitespace(value)
  const normalized =
    attributeAliases.get(normalizeLookupKey(raw)) ?? attributeAliases.get(raw)

  if (!normalized) {
    throw new Error(
      `Unsupported attr "${raw}". Supported canonical values: ${canonicalAttributes.join(', ')}`
    )
  }

  return normalized
}

function normalizeType(value: unknown) {
  const raw = normalizeCsvWhitespace(value)
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
  const rawBase = normalizeCsvWhitespace(rawMatch?.[1] ?? normalizedRaw)
  const rawVariant = normalizeCsvWhitespace(rawMatch?.[2] ?? '')
  const normalizedBase =
    baseTypeAliases.get(normalizeLookupKey(rawBase)) ?? baseTypeAliases.get(rawBase)
  const normalizedVariant =
    variantAliases.get(normalizeLookupKey(rawVariant)) ?? variantAliases.get(rawVariant)

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
    .map((part) => normalizeCsvWhitespace(part))
    .filter(Boolean)

  if (parts.length >= 1) {
    const basePart = parts[0]
    const variantPart = parts.slice(1).join('')
    const normalizedSplitBase =
      baseTypeAliases.get(normalizeLookupKey(basePart)) ?? baseTypeAliases.get(basePart)
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

export function normalizeSkillMasterCsvRecords(records: CsvRecord[]) {
  const normalized: SkillMasterImportPayload[] = []
  const errors: string[] = []
  const duplicateIds = new Set<string>()
  const seenIds = new Set<string>()
  let normalizedAttrCount = 0
  let normalizedTypeCount = 0

  records.forEach((record) => {
    const rowNumber = record.__rowNumber
    const id = normalizeCsvWhitespace(record.id)
    const name = normalizeCsvWhitespace(record.name)
    const attrInput = record.attr
    const typeInput = record.type
    const hasCool = Object.prototype.hasOwnProperty.call(record, 'cool')
    const hasSwGauge = Object.prototype.hasOwnProperty.call(record, 'swGauge')
    const hasBrGauge = Object.prototype.hasOwnProperty.call(record, 'brGauge')
    const hasImage = Object.prototype.hasOwnProperty.call(record, 'image')

    if (
      !id ||
      !name ||
      normalizeCsvWhitespace(attrInput) === '' ||
      normalizeCsvWhitespace(typeInput) === '' ||
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
      const cool = normalizeCsvWhitespace(record.cool)
      const swGauge = normalizeCsvWhitespace(record.swGauge)
      const brGauge = normalizeCsvWhitespace(record.brGauge)
      const image = normalizeCsvWhitespace(record.image)

      if (attr !== normalizeCsvWhitespace(attrInput)) {
        normalizedAttrCount += 1
      }

      if (type !== normalizeCsvWhitespace(typeInput)) {
        normalizedTypeCount += 1
      }

      if (seenIds.has(id)) {
        duplicateIds.add(id)
        return
      }

      seenIds.add(id)
      normalized.push({
        rowNumber,
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
      errors.push(
        `Row ${rowNumber}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })

  if (duplicateIds.size > 0) {
    errors.push(`Duplicate skill IDs detected: ${Array.from(duplicateIds).join(', ')}`)
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

export function getSkillMasterImportChangeType(
  payload: SkillMasterImportPayload,
  existingSkillMap: Map<string, SkillMaster>
): SkillMasterImportChangeType {
  const existing = existingSkillMap.get(payload.id)

  if (!existing) {
    return 'insert'
  }

  if (
    existing.name === payload.name &&
    existing.attr === payload.attr &&
    existing.type === payload.type &&
    existing.cool === payload.cool &&
    existing.swGauge === payload.swGauge &&
    existing.brGauge === payload.brGauge &&
    existing.image === payload.image
  ) {
    return 'unchanged'
  }

  return 'update'
}
