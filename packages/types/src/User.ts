import { DefaultType } from './default'
import { Guild } from './Guild'
export type User = {
  /** キャラクターネーム */
  charaName: string
  /** キャラネームカタカナ */
  charaNameKana: string
  /** 所属ギルドID */
  guildId: Guild['id']
  /** ギルド所属日 */
  affiliationDate: Date | null
  /** 所属No */
  affiliationNum: number
  /** プレイヤー状況 */
  situation: '現役' | '隠居' | '引退' | ''
  /** ゲーム開始日時 */
  gameStartDateAt: Date | null
  contact: {
    /** 登録メールアドレス */
    email: string
    /** 登録電話番号 */
    phone: string
  }
  /** 誕生日 */
  birthDateAt: Date | null
  /** 最終ログイン日 */
  lastLoginDateAt: Date | null
  /** ロール */
  role: '管理者' | 'エンドユーザー'
  /**
   * スキルレコード一覧
   * @param {string[]} sword 片手直剣
   * @param {string[]} rapier 片手細剣
   * @param {string[]} club 片手棍
   * @param {string[]} dagger 片手短剣
   * @param {string[]} axe 両手斧
   * @param {string[]} spear 両手槍
   * @param {string[]} bow 両手弓
   * @param {string[]} shield 盾
   * @param {string[]} ability アビリティ
   * @param {string[]} abilityRecollection 覚醒アビリティ
   * @param {string[]} abilityAccele アクセルアビリティ
   * @param {string[]} weaponRecollection 武器覚醒
   * @param {string[]} weaponMod 武器MOD
   * @param {string[]} weaponConnect 武器コネクト
   * @param {string[]} weaponAccele 武器アクセル
   * @param {string[]} burst_FullBurst バースト/フルバースト
   * @param {string[]} free フリー
   */
  skillRecord: {
    /** 片手直剣 */
    sword: string[]
    /** 片手細剣 */
    rapier: string[]
    /** 片手棍 */
    club: string[]
    /** 片手短剣 */
    dagger: string[]
    /** 両手斧 */
    axe: string[]
    /** 両手槍 */
    spear: string[]
    /** 両手弓 */
    bow: string[]
    /** 盾 */
    shield: string[]
    /** アビリティ */
    ability: string[]
    /** 覚醒アビリティ */
    abilityRecollection: string[]
    /** アクセルアビリティ */
    abilityAccele: string[]
    /** 武器覚醒スキル */
    weaponRecollection: string[]
    /** 武器MODスキル */
    weaponMod: string[]
    /** 武器Connectスキル */
    weaponConnect: string[]
    /** 武器Acceleスキル */
    weaponAccele: string[]
    /** フルバースト/バーストスキル */
    burst_FullBurst: string[]
    /** フリー枠 */
    free: string[]
  }
  /** 熟練度レベル */
  proficiencyLevel: {
    sword: number
    rapier: number
    club: number
    dagger: number
    axe: number
    spear: number
    bow: number
    shield: number
  }
} & DefaultType

export function defaultUser(): User {
  return {
    id: '',
    createdAt: new Date(),
    createdBy: '',
    updatedAt: new Date(),
    updatedBy: '',
    charaName: '',
    charaNameKana: '',
    guildId: '',
    affiliationDate: null,
    affiliationNum: 0,
    situation: '現役',
    gameStartDateAt: null,
    contact: {
      email: '',
      phone: ''
    },
    birthDateAt: null,
    lastLoginDateAt: null,
    role: 'エンドユーザー',
    skillRecord: {
      sword: [],
      rapier: [],
      club: [],
      dagger: [],
      axe: [],
      spear: [],
      bow: [],
      shield: [],
      ability: [],
      abilityRecollection: [],
      abilityAccele: [],
      weaponRecollection: [],
      weaponMod: [],
      weaponConnect: [],
      weaponAccele: [],
      burst_FullBurst: [],
      free: []
    },
    proficiencyLevel: {
      sword: 0,
      rapier: 0,
      club: 0,
      dagger: 0,
      axe: 0,
      spear: 0,
      bow: 0,
      shield: 0
    }
  }
}

export type SkillRecord = User['skillRecord']
export type ProficiencyLevel = User['proficiencyLevel']

