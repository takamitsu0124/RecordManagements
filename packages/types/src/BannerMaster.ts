import { DefaultType } from "./default";

export type BannerMaster = {
  /** 表示 / 非表示 */
  isActive: boolean;
  /** 表示開始日。null の場合は開始制限なし */
  startAt: Date | null;
  /** 表示終了日。null の場合は終了制限なし */
  endAt: Date | null;
  /** Firebase Storage にアップロードしたバナー画像の download URL */
  imageUrl: string;
} & DefaultType;

export function defaultBannerMaster(): BannerMaster {
  return {
    id: "",
    createdAt: new Date(),
    createdBy: "",
    updatedAt: new Date(),
    updatedBy: "",
    isActive: true,
    startAt: null,
    endAt: null,
    imageUrl: "",
  };
}
