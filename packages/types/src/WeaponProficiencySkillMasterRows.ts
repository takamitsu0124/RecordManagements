type RawWeaponProficiencySkillRow = {
  required_level: number
  skill_name: string | null
  weapon_type: string
  values: number[]
}

const weaponRowTemplates: Omit<
  RawWeaponProficiencySkillRow,
  'skill_name' | 'weapon_type'
>[] = [
  {
    required_level: 30,
    values: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  },
  {
    required_level: 50,
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 50,
    values: [10, 13, 16, 19, 22, 25, 28, 31, 34, 37]
  },
  {
    required_level: 55,
    values: [12, 15, 18, 21, 24, 27, 30, 33, 36, 39]
  },
  {
    required_level: 60,
    values: [12, 15, 18, 21, 24, 27, 30, 33, 36, 39]
  },
  {
    required_level: 65,
    values: [14, 18, 22, 26, 30, 34, 38, 42, 46, 50]
  },
  {
    required_level: 70,
    values: [14, 18, 22, 26, 30, 34, 38, 42, 46, 50]
  },
  {
    required_level: 75,
    values: [16, 21, 26, 31, 36, 41, 46, 51, 56, 61]
  },
  {
    required_level: 75,
    values: [16, 21, 26, 31, 36, 41, 46, 51, 56, 61]
  },
  {
    required_level: 80,
    values: [16, 21, 26, 31, 36, 41, 46, 51, 56, 61]
  },
  {
    required_level: 85,
    values: [18, 24, 30, 36, 42, 48, 54, 60, 66, 72]
  },
  {
    required_level: 90,
    values: [18, 24, 30, 36, 42, 48, 54, 60, 66, 72]
  },
  {
    required_level: 95,
    values: [20, 27, 34, 41, 48, 55, 62, 69, 76, 83]
  },
  {
    required_level: 100,
    values: [20, 27, 34, 41, 48, 55, 62, 69, 76, 83]
  },
  {
    required_level: 105,
    values: [20, 27, 34, 41, 48, 55, 62, 69, 76, 83]
  },
  {
    required_level: 110,
    values: [20, 27, 34, 41, 48, 55, 62, 69, 76, 83]
  }
]

const swordSkillNames = [
  '発展の構え',
  'フレイムグロー',
  'アクアグロー',
  'ウィンドグロー',
  'アースグロー',
  'シャイングロー',
  'ダークグロー',
  '躍進の剣技',
  '崩しの基礎',
  '生存の心得',
  '剣撃熟達',
  '堅守の心得',
  '火傷ガード',
  '猛攻の心得',
  '斬撃上達',
  'ハートブレイク',
  '単体剣撃熟達',
  'フレイムライズ',
  '剣技熟練',
  'フレイムチャージ',
  '逆境堅守',
  '絆の連技'
] as const

const rapierSkillNames = [...swordSkillNames]
// 片手細剣だけ一部の skill_name を変えたい場合は、複製後に index 指定で上書きします。
// index の並び順は weaponRowTemplates と一致しています。
// 例:
// rapierSkillNames[7] = '細剣用のスキル名'
const clubSkillNames = [...swordSkillNames]
const daggerSkillNames = [...swordSkillNames]
const axeSkillNames = [...swordSkillNames]
const spearSkillNames = [...swordSkillNames]
const bowSkillNames = [...swordSkillNames]

const createRawWeaponRows = (
  weaponType: string,
  skillNames: readonly (string | null)[]
): RawWeaponProficiencySkillRow[] => {
  if (skillNames.length !== weaponRowTemplates.length) {
    throw new Error(
      `weapon proficiency skill names mismatch for ${weaponType}: expected ${weaponRowTemplates.length}, got ${skillNames.length}`
    )
  }

  return weaponRowTemplates.map((template, index) => ({
    required_level: template.required_level,
    skill_name: skillNames[index] ?? null,
    weapon_type: weaponType,
    values: [...template.values]
  }))
}

export const rawSwordRows = createRawWeaponRows('片手直剣', swordSkillNames)
export const rawRapierRows = createRawWeaponRows('片手細剣', rapierSkillNames)
export const rawClubRows = createRawWeaponRows('片手棍', clubSkillNames)
export const rawDaggerRows = createRawWeaponRows('短剣', daggerSkillNames)
export const rawAxeRows = createRawWeaponRows('両手斧', axeSkillNames)
export const rawSpearRows = createRawWeaponRows('両手槍', spearSkillNames)
export const rawBowRows = createRawWeaponRows('弓', bowSkillNames)
