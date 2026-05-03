import { DefaultType } from './default'

export type SkillMaster = {
	/** スキルの表示名 */
	name: string
	/** キャラクター名 */
	characterName: string
	/** レアリティ */
	rarity: string
	/** コスト */
	cost: number | null
	/** 装備種別 */
	equipmentType: string
	/** 消費SP */
	sp: number | null
	/** 自然属性 */
	element: string
	/** スキル種別 */
	skillType: string
	/** 攻撃属性 */
	attackType: string
	/** ブレイクゲージ増加量 */
	breakGauge: number | null
	/** スイッチゲージ増加量 */
	switchGauge: number | null
	/** クールダウン */
	cooldown: number | null
	/** 技名 */
	skillName: string
	/** 効果内容 */
	effect: string
	/** スキル画像URL */
	image: string
} & DefaultType

export function defaultSkillMaster(): SkillMaster {
	return {
		id: '',
		createdAt: new Date(),
		createdBy: '',
		updatedAt: new Date(),
		updatedBy: '',
		name: '',
		characterName: '',
		rarity: '',
		cost: null,
		equipmentType: '',
		sp: null,
		element: '',
		skillType: '通常',
		attackType: '',
		breakGauge: null,
		switchGauge: null,
		cooldown: null,
		skillName: '',
		effect: '',
		image: '',
	}
}
