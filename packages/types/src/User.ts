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
  birthDate: Date | null
  /** 最終ログイン日 */
  lastLoginDateAt: Date | null
  /** ロール */
  roles: ('管理者' | 'エンドユーザー')[]
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
    sword: []
    /** 片手細剣 */
    rapier: []
    /** 片手棍 */
    club: []
    /** 片手短剣 */
    dagger: []
    /** 両手斧 */
    axe: []
    /** 両手槍 */
    spear: []
    /** 両手弓 */
    bow: []
    /** 盾 */
    shield: []
    /** アビリティ */
    ability: []
    /** 覚醒アビリティ */
    abilityRecollection: []
    /** アクセルアビリティ */
    abilityAccele: []
    /** 武器覚醒スキル */
    weaponRecollection: []
    /** 武器MODスキル */
    weaponMod: []
    /** 武器Connectスキル */
    weaponConnect: []
    /** 武器Acceleスキル */
    weaponAccele: []
    /** フルバースト/バーストスキル */
    burst_FullBurst: []
    /** フリー枠 */
    free: []
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
    situation: '',
    gameStartDateAt: null,
    contact: {
      email: '',
      phone: ''
    },
    birthDate: null,
    lastLoginDateAt: null,
    roles: ['エンドユーザー'],
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
