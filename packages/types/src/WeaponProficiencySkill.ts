import {
  rawAxeRows,
  rawBowRows,
  rawClubRows,
  rawDaggerRows,
  rawRapierRows,
  rawSpearRows,
  rawSwordRows
} from './WeaponProficiencySkillMasterRows'

export const weaponProficiencySkillWeaponDefinitions = [
  { key: 'sword', label: '片手直剣' },
  { key: 'rapier', label: '片手細剣' },
  { key: 'club', label: '片手棍' },
  { key: 'dagger', label: '短剣' },
  { key: 'axe', label: '両手斧' },
  { key: 'spear', label: '両手槍' },
  { key: 'bow', label: '弓' },
  { key: 'shield', label: '盾' }
] as const

export type WeaponProficiencySkillWeaponKey =
  (typeof weaponProficiencySkillWeaponDefinitions)[number]['key']

export type WeaponProficiencySkillMasterRow = {
  id: string
  requiredLevel: number
  skillName: string | null
  weaponKey: WeaponProficiencySkillWeaponKey
  weaponType: string
  values: number[]
}

export type WeaponProficiencySkillProgress = Record<
  WeaponProficiencySkillWeaponKey,
  Record<string, boolean[]>
>

export type WeaponProficiencySkillUnlockRateSummary = {
  unlockedCount: number
  totalCount: number
  unlockRate: number
  remainingBottleCount: number
  byWeapon: Record<
    WeaponProficiencySkillWeaponKey,
    {
      unlockedCount: number
      totalCount: number
      unlockRate: number
      remainingBottleCount: number
    }
  >
}

const createWeaponMasterRows = (
  weaponKey: WeaponProficiencySkillWeaponKey,
  weaponType: string,
  rawRows: readonly {
    required_level: number
    skill_name: string | null
    weapon_type: string
    values: readonly number[]
  }[]
): WeaponProficiencySkillMasterRow[] =>
  rawRows.map((row, index) => ({
    id: `${weaponKey}-${row.required_level}-${row.skill_name ?? 'none'}-${index}`,
    requiredLevel: row.required_level,
    skillName: row.skill_name,
    weaponKey,
    weaponType,
    values: [...row.values]
  }))

export const weaponProficiencySkillMasterRows: WeaponProficiencySkillMasterRow[] = [
  ...createWeaponMasterRows('sword', '片手直剣', rawSwordRows),
  ...createWeaponMasterRows('rapier', '片手細剣', rawRapierRows),
  ...createWeaponMasterRows('club', '片手棍', rawClubRows),
  ...createWeaponMasterRows('dagger', '短剣', rawDaggerRows),
  ...createWeaponMasterRows('axe', '両手斧', rawAxeRows),
  ...createWeaponMasterRows('spear', '両手槍', rawSpearRows),
  ...createWeaponMasterRows('bow', '弓', rawBowRows)
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function defaultWeaponProficiencySkillProgress(): WeaponProficiencySkillProgress {
  return {
    sword: {},
    rapier: {},
    club: {},
    dagger: {},
    axe: {},
    spear: {},
    bow: {},
    shield: {}
  }
}

export function normalizeWeaponProficiencySkillProgress(
  value?: Partial<Record<WeaponProficiencySkillWeaponKey, unknown>> | null
): WeaponProficiencySkillProgress {
  const normalized = defaultWeaponProficiencySkillProgress()

  weaponProficiencySkillWeaponDefinitions.forEach(({ key }) => {
    const weaponProgress = value?.[key]
    if (!isRecord(weaponProgress)) {
      normalized[key] = {}
      return
    }

    normalized[key] = Object.fromEntries(
      Object.entries(weaponProgress)
        .filter(([rowId]) => typeof rowId === 'string')
        .map(([rowId, rowProgress]) => [
          rowId,
          Array.isArray(rowProgress)
            ? rowProgress.map((entry) => Boolean(entry))
            : []
        ])
    )
  })

  return normalized
}

export function summarizeWeaponProficiencySkillUnlockRate(
  progress?: Partial<Record<WeaponProficiencySkillWeaponKey, unknown>> | null,
  masterRows: WeaponProficiencySkillMasterRow[] = weaponProficiencySkillMasterRows
): WeaponProficiencySkillUnlockRateSummary {
  const normalizedProgress = normalizeWeaponProficiencySkillProgress(progress)

  const byWeapon = Object.fromEntries(
    weaponProficiencySkillWeaponDefinitions.map(({ key }) => {
      const weaponRows = masterRows.filter((row) => row.weaponKey === key)
      const summary = weaponRows.reduce(
        (totals, row) => {
          const rowProgress = normalizedProgress[key][row.id] ?? []
          row.values.forEach((requiredBottleCount, index) => {
            const normalizedRequiredBottleCount =
              Number(requiredBottleCount) || 0
            const isUnlocked = rowProgress[index] === true

            if (isUnlocked) {
              totals.unlockedCount += 1
            } else {
              totals.remainingBottleCount += normalizedRequiredBottleCount
            }

            totals.totalCount += 1
          })

          return totals
        },
        {
          unlockedCount: 0,
          totalCount: 0,
          remainingBottleCount: 0
        }
      )
      const unlockRate =
        summary.totalCount > 0
          ? (summary.unlockedCount / summary.totalCount) * 100
          : 0

      return [
        key,
        {
          unlockedCount: summary.unlockedCount,
          totalCount: summary.totalCount,
          unlockRate,
          remainingBottleCount: summary.remainingBottleCount
        }
      ]
    })
  ) as WeaponProficiencySkillUnlockRateSummary['byWeapon']

  const unlockedCount = weaponProficiencySkillWeaponDefinitions.reduce(
    (total, { key }) => total + byWeapon[key].unlockedCount,
    0
  )
  const totalCount = weaponProficiencySkillWeaponDefinitions.reduce(
    (total, { key }) => total + byWeapon[key].totalCount,
    0
  )
  const remainingBottleCount = weaponProficiencySkillWeaponDefinitions.reduce(
    (total, { key }) => total + byWeapon[key].remainingBottleCount,
    0
  )
  const unlockRate = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  return {
    unlockedCount,
    totalCount,
    unlockRate,
    remainingBottleCount,
    byWeapon
  }
}
