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
  // '武器の知識', //Lv25 1~
  // 'スイッチチャージ', //Lv30 3~（細剣：流星）（棍：ウェポンブレイク）（短剣：執行者の眼）（斧：金剛）（槍：槍舞）（弓：三日月）
  '発展の構え', //Lv30[0]
  // '剣の極意', //Lv35 10~（細剣：細剣の極意）（棍：棍の極意）（短剣：短剣の極意）（斧：斧の極意）（槍：槍の極意）（弓：弓の極意）
  // '剣技熟達', //Lv40 10~
  // 'オーバーチャージ Ⅰ', //Lv45 50
  'フレイムグロー', //Lv50[1]
  'アクアグロー', //Lv50[2]
  'ウィンドグロー', //Lv50[3]
  'アースグロー', //Lv50[4]
  'シャイングロー', //Lv50[5]
  'ダークグロー', //Lv50[6]
  '躍進の剣技', //Lv50[7]
  '崩しの基礎', //Lv50[8]
  '生存の心得', //Lv55[9]
  '斬撃熟練', //Lv60[10]
  '堅守の心得', //Lv65[11]
  '火傷ガード', //Lv70[12]
  '猛攻の心得', //Lv75[13]
  '斬撃上達', //Lv75[14]
  'ハートブレイク', //Lv80[15]
  '単体剣撃熟達', //Lv85[16]
  'フレイムライズ', //Lv90[17]
  '剣技熟練', //Lv95[18]
  'フレイムチャージ', //Lv100[19]
  '逆境堅守', //Lv105[20]
  '絆の連技' //Lv110[21]
] as const

const rapierSkillNames: (string | null)[] = [...swordSkillNames]
// 片手細剣だけ一部の skill_name を変えたい場合は、複製後に index 指定で上書きします。
rapierSkillNames[10] = '刺突熟練'
rapierSkillNames[12] = '急所強襲'
rapierSkillNames[14] = '刺突上達'
rapierSkillNames[15] = '急所への一突き'
rapierSkillNames[16] = '精密な一撃'
rapierSkillNames[17] = 'アクアライズ'
rapierSkillNames[18] = '精巧な一撃'
rapierSkillNames[19] = 'アクアチャージ'
rapierSkillNames[20] = '弱点襲撃'
const clubSkillNames: (string | null)[] = [...swordSkillNames]
clubSkillNames[10] = '打撃熟練'
clubSkillNames[12] = '刻まれた一撃'
clubSkillNames[14] = '打撃上達'
clubSkillNames[15] = '豪打の援護'
clubSkillNames[16] = 'ハイディフェンス'
clubSkillNames[17] = 'ウィンドライズ'
clubSkillNames[18] = '鼓舞激励'
clubSkillNames[19] = 'ウィンドチャージ'
clubSkillNames[20] = '刻印強打'
const daggerSkillNames: (string | null)[] = [...swordSkillNames]
daggerSkillNames[12] = '追い打ちの一撃'
daggerSkillNames[15] = '鋭利な一閃'
daggerSkillNames[16] = '状態異常特効'
daggerSkillNames[17] = 'ダークライズ'
daggerSkillNames[18] = '磨かれた一撃'
daggerSkillNames[19] = 'ダークチャージ'
daggerSkillNames[20] = '出血強襲'
const axeSkillNames: (string | null)[] = [...swordSkillNames]
axeSkillNames[10] = '打撃熟練'
axeSkillNames[12] = 'パワフルパワー'
axeSkillNames[14] = '打撃上達'
axeSkillNames[15] = '逆転の強化'
axeSkillNames[16] = '豪快な強襲'
axeSkillNames[17] = 'アースライズ'
axeSkillNames[18] = '単体剣技熟達'
axeSkillNames[19] = 'アースチャージ'
axeSkillNames[20] = 'パワフルアタック'
const spearSkillNames: (string | null)[] = [...swordSkillNames]
spearSkillNames[10] = '刺突熟練'
spearSkillNames[12] = '烙印スイッチ'
spearSkillNames[14] = '刺突上達'
spearSkillNames[15] = '弱者への追撃'
spearSkillNames[16] = '全体剣技熟達'
spearSkillNames[17] = 'ウィンドライズ'
spearSkillNames[18] = '崩しの技術'
spearSkillNames[19] = 'ウィンドチャージ'
spearSkillNames[20] = '装甲減退スイッチ'
const bowSkillNames: (string | null)[] = [...swordSkillNames]
bowSkillNames[10] = '刺突熟練'
bowSkillNames[12] = '背後からの一撃'
bowSkillNames[14] = '刺突上達'
bowSkillNames[15] = 'ハードブレイク'
bowSkillNames[16] = '逆転の一撃'
bowSkillNames[17] = 'シャインライズ'
bowSkillNames[18] = '単体剣技熟達'
bowSkillNames[19] = 'シャインチャージ'
bowSkillNames[20] = '逆転の強襲'

const shieldRowTemplates: Omit<
  RawWeaponProficiencySkillRow,
  'skill_name' | 'weapon_type'
>[] = []

const shieldSkillNames: (string | null)[] = []

const createRawWeaponRows = (
  weaponType: string,
  skillNames: readonly (string | null)[],
  rowTemplates: readonly Omit<
    RawWeaponProficiencySkillRow,
    'skill_name' | 'weapon_type'
  >[] = weaponRowTemplates
): RawWeaponProficiencySkillRow[] => {
  if (skillNames.length !== rowTemplates.length) {
    throw new Error(
      `weapon proficiency skill names mismatch for ${weaponType}: expected ${rowTemplates.length}, got ${skillNames.length}`
    )
  }

  return rowTemplates.map((template, index) => ({
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
export const rawShieldRows = createRawWeaponRows(
  '盾',
  shieldSkillNames,
  shieldRowTemplates
)
