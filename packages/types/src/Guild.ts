import { DefaultType } from './default'
import { AppUser } from './AppUser'
export type Guild = {
  /** ギルドネーム */
  guildName: string
  /** ギルドネームカタカナ */
  guildNameKana: string
  /** ギルド創設日 */
  guildFoundingDateAt: Date | null
  /** 状況 */
  situation: '存続' | '解散' | ''
  /** ゲーム内ギルドID */
  guildIdInGame: string
  /** 正式メンバー数 */
  officialMembers: number
  /** ギルドメモ */
  guildMemo: string
  /** ギルドロゴ */
  guildLogo: string
  /** 共有 Google Calendar ID */
  googleCalendarId: string
  /** ギルドメンバー */
  guildMember: { [uid: string]: { name: AppUser['displayName'] } }
} & DefaultType

export function defaultGuild(): Guild {
  return {
    id: '',
    createdAt: new Date(),
    createdBy: '',
    updatedAt: new Date(),
    updatedBy: '',
    guildName: '',
    guildNameKana: '',
    guildFoundingDateAt: null,
    situation: '',
    guildIdInGame: '',
    officialMembers: 0,
    guildMemo: '',
    guildLogo: '',
    googleCalendarId: '',
    guildMember: {}
  }
}
