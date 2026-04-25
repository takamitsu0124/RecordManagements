import { SkillMaster } from '@rm/types'
import { CsvRecord, normalizeCsvWhitespace } from './csv'
import {
  normalizeSkillMasterAttackType,
  normalizeSkillMasterElement,
  normalizeSkillMasterEquipmentType,
  normalizeSkillMasterNumber,
  normalizeSkillMasterRarity,
  normalizeSkillMasterSkillType,
} from './skillMasterSchema'

export type SkillMasterImportPayload = Pick<
  SkillMaster,
  | 'id'
  | 'name'
  | 'rarity'
  | 'cost'
  | 'equipmentType'
  | 'sp'
  | 'element'
  | 'skillType'
  | 'attackType'
  | 'breakGauge'
  | 'switchGauge'
  | 'cooldown'
  | 'skillName'
  | 'image'
> & {
  rowNumber: number
}

export type SkillMasterImportChangeType = 'insert' | 'update' | 'unchanged'

type SkillMasterImportStats = {
  total: number
  valid: number
  normalizedElementCount: number
  normalizedEquipmentTypeCount: number
  normalizedSkillTypeCount: number
  normalizedAttackTypeCount: number
}

function normalizeRequiredTextField(value: unknown, fieldName: string) {
  const normalized = normalizeCsvWhitespace(value)
  if (!normalized) {
    throw new Error(`${fieldName} is required.`)
  }
  return normalized
}

export function normalizeSkillMasterCsvRecords(records: CsvRecord[]) {
  const normalized: SkillMasterImportPayload[] = []
  const errors: string[] = []
  const duplicateIds = new Set<string>()
  const seenIds = new Set<string>()
  let normalizedElementCount = 0
  let normalizedEquipmentTypeCount = 0
  let normalizedSkillTypeCount = 0
  let normalizedAttackTypeCount = 0

  records.forEach((record) => {
    const rowNumber = record.__rowNumber
    const id = normalizeCsvWhitespace(record.id)
    const name = normalizeCsvWhitespace(record.name)
    const rawElement = record.element
    const rawEquipmentType = record.equipmentType
    const rawSkillType = record.skillType
    const rawAttackType = record.attackType
    const hasRarity = Object.prototype.hasOwnProperty.call(record, 'rarity')
    const hasCost = Object.prototype.hasOwnProperty.call(record, 'cost')
    const hasSp = Object.prototype.hasOwnProperty.call(record, 'sp')
    const hasElement = Object.prototype.hasOwnProperty.call(record, 'element')
    const hasEquipmentType = Object.prototype.hasOwnProperty.call(record, 'equipmentType')
    const hasSkillType = Object.prototype.hasOwnProperty.call(record, 'skillType')
    const hasAttackType = Object.prototype.hasOwnProperty.call(record, 'attackType')
    const hasBreakGauge = Object.prototype.hasOwnProperty.call(record, 'breakGauge')
    const hasSwitchGauge = Object.prototype.hasOwnProperty.call(record, 'switchGauge')
    const hasCooldown = Object.prototype.hasOwnProperty.call(record, 'cooldown')
    const hasSkillName = Object.prototype.hasOwnProperty.call(record, 'skillName')
    const hasImage = Object.prototype.hasOwnProperty.call(record, 'image')

    if (
      !id ||
      !name ||
      !hasRarity ||
      !hasCost ||
      !hasEquipmentType ||
      !hasSp ||
      !hasElement ||
      !hasSkillType ||
      !hasAttackType ||
      !hasBreakGauge ||
      !hasSwitchGauge ||
      !hasCooldown ||
      !hasSkillName ||
      !hasImage
    ) {
      errors.push(
        `Row ${rowNumber}: id, name, rarity, cost, equipmentType, sp, element, skillType, attackType, breakGauge, switchGauge, cooldown, skillName, image are required keys.`
      )
      return
    }

    try {
      const equipmentType = normalizeRequiredTextField(
        normalizeSkillMasterEquipmentType(rawEquipmentType),
        'equipmentType'
      )
      const element = normalizeRequiredTextField(
        normalizeSkillMasterElement(rawElement),
        'element'
      )
      const skillType = normalizeSkillMasterSkillType(rawSkillType)
      const attackType = normalizeSkillMasterAttackType(rawAttackType, equipmentType)
      const rarity = normalizeSkillMasterRarity(record.rarity)
      const cost = normalizeSkillMasterNumber(record.cost)
      const sp = normalizeSkillMasterNumber(record.sp)
      const breakGauge = normalizeSkillMasterNumber(record.breakGauge)
      const switchGauge = normalizeSkillMasterNumber(record.switchGauge)
      const cooldown = normalizeSkillMasterNumber(record.cooldown)
      const skillName = normalizeRequiredTextField(record.skillName, 'skillName')
      const image = normalizeRequiredTextField(record.image, 'image')

      if (element !== normalizeCsvWhitespace(rawElement)) {
        normalizedElementCount += 1
      }

      if (equipmentType !== normalizeCsvWhitespace(rawEquipmentType)) {
        normalizedEquipmentTypeCount += 1
      }

      if (skillType !== normalizeCsvWhitespace(rawSkillType || '')) {
        normalizedSkillTypeCount += 1
      }

      if (
        attackType &&
        attackType !== normalizeCsvWhitespace(rawAttackType || '')
      ) {
        normalizedAttackTypeCount += 1
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
        rarity,
        cost,
        equipmentType,
        sp,
        element,
        skillType,
        attackType,
        breakGauge,
        switchGauge,
        cooldown,
        skillName,
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
      normalizedElementCount,
      normalizedEquipmentTypeCount,
      normalizedSkillTypeCount,
      normalizedAttackTypeCount,
    } satisfies SkillMasterImportStats,
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
    existing.rarity === payload.rarity &&
    existing.cost === payload.cost &&
    existing.equipmentType === payload.equipmentType &&
    existing.sp === payload.sp &&
    existing.element === payload.element &&
    existing.skillType === payload.skillType &&
    existing.attackType === payload.attackType &&
    existing.breakGauge === payload.breakGauge &&
    existing.switchGauge === payload.switchGauge &&
    existing.cooldown === payload.cooldown &&
    existing.skillName === payload.skillName &&
    existing.image === payload.image
  ) {
    return 'unchanged'
  }

  return 'update'
}
