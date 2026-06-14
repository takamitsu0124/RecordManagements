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

const rawSwordRows = [
  // {
  //   required_level: 25,
  //   skill_name: "武器の知識",
  //   weapon_type: "片手直剣",
  //   values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  // },
  // {
  //   required_level: 30,
  //   skill_name: "スイッチチャージ",
  //   weapon_type: "片手直剣",
  //   values: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  // },
  {
    required_level: 30,
    skill_name: '発展の構え',
    weapon_type: '片手直剣',
    values: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  },
  // {
  //   required_level: 35,
  //   skill_name: '剣の極意',
  //   weapon_type: '片手直剣',
  //   values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  // },
  // {
  //   required_level: 40,
  //   skill_name: '剣技熟達',
  //   weapon_type: '片手直剣',
  //   values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  // },
  // {
  //   required_level: 45,
  //   skill_name: 'オーバーチャージ Ⅰ',
  //   weapon_type: '片手直剣',
  //   values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  // },
  {
    required_level: 50,
    skill_name: 'フレイムグロー',
    weapon_type: '片手直剣',
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    skill_name: 'アクアグロー',
    weapon_type: '片手直剣',
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    skill_name: 'ウィンドグロー',
    weapon_type: '片手直剣',
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    skill_name: 'アースグロー',
    weapon_type: '片手直剣',
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    skill_name: 'シャイングロー',
    weapon_type: '片手直剣',
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    skill_name: 'ダークグロー',
    weapon_type: '片手直剣',
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    skill_name: '躍進の剣技',
    weapon_type: '片手直剣',
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    skill_name: '崩しの基礎',
    weapon_type: '片手直剣',
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 55,
    skill_name: '生存の心得',
    weapon_type: '片手直剣',
    values: [12, 15, 18, 21, 24, 27, 30, 33, 36, 39]
  },
  {
    required_level: 60,
    skill_name: '剣撃熟達',
    weapon_type: '片手直剣',
    values: [12, 15, 18, 21, 24, 27, 30, 33, 36, 39]
  },
  {
    required_level: 65,
    skill_name: '堅守の心得',
    weapon_type: '片手直剣',
    values: [14, 18, 22, 26, 30, 34, 38, 42, 46, 50]
  },
  {
    required_level: 70,
    skill_name: '火傷ガード',
    weapon_type: '片手直剣',
    values: [14, 18, 22, 26, 30, 34, 38, 42, 46, 50]
  },
  {
    required_level: 75,
    skill_name: '猛攻の心得',
    weapon_type: '片手直剣',
    values: [16, 21, 26, 31, 36, 41, 46, 51, 56, 61]
  },
  {
    required_level: 75,
    skill_name: '斬撃上達',
    weapon_type: '片手直剣',
    values: [16, 21, 26, 31, 36, 41, 46, 51, 56, 61]
  },
  {
    required_level: 80,
    skill_name: 'ハートブレイク',
    weapon_type: '片手直剣',
    values: [16, 21, 26, 31, 36, 41, 46, 51, 56, 61]
  },
  {
    required_level: 85,
    skill_name: '単体剣撃熟達',
    weapon_type: '片手直剣',
    values: [18, 24, 30, 36, 42, 48, 54, 60, 66, 72]
  },
  {
    required_level: 90,
    skill_name: 'フレイムライズ',
    weapon_type: '片手直剣',
    values: [18, 24, 30, 36, 42, 48, 54, 60, 66, 72]
  },
  {
    required_level: 95,
    skill_name: '剣技熟練',
    weapon_type: '片手直剣',
    values: [20, 27, 34, 41, 48, 55, 62, 69, 76, 83]
  },
  {
    required_level: 100,
    skill_name: 'フレイムチャージ',
    weapon_type: '片手直剣',
    values: [20, 27, 34, 41, 48, 55, 62, 69, 76, 83]
  },
  {
    required_level: 105,
    skill_name: '逆境堅守',
    weapon_type: '片手直剣',
    values: [20, 27, 34, 41, 48, 55, 62, 69, 76, 83]
  },
  {
    required_level: 110,
    skill_name: '絆の連技',
    weapon_type: '片手直剣',
    values: [20, 27, 34, 41, 48, 55, 62, 69, 76, 83]
  }
] as const

export const weaponProficiencySkillMasterRows: WeaponProficiencySkillMasterRow[] =
  rawSwordRows.map((row, index) => ({
    id: `sword-${row.required_level}-${row.skill_name ?? 'none'}-${index}`,
    requiredLevel: row.required_level,
    skillName: row.skill_name,
    weaponKey: 'sword',
    weaponType: row.weapon_type,
    values: [...row.values]
  }))

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
