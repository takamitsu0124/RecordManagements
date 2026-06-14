import { DefaultType } from "./default";
import { AppRole } from "./AppRole";
import {
  WeaponProficiencySkillProgress,
  defaultWeaponProficiencySkillProgress,
} from "./WeaponProficiencySkill";

export const weaponProficiencyDefinitions = [
  { key: "oneHandSword", label: "片手直剣" },
  { key: "rapier", label: "細剣" },
  { key: "club", label: "棍棒" },
  { key: "dagger", label: "短剣" },
  { key: "axe", label: "斧" },
  { key: "spear", label: "槍" },
  { key: "bow", label: "弓" },
  { key: "shield", label: "盾" },
] as const;

export type WeaponProficiencyKey =
  (typeof weaponProficiencyDefinitions)[number]["key"];

export type WeaponProficiencyLevels = Record<
  WeaponProficiencyKey,
  number | null
>;

export type AttendanceFeatureVisibilityStatus = "visible" | "hidden";

export const weaponProficiencyMinLevel = 1;
export const weaponProficiencyMaxLevel = 105;
export const weaponProficiencyMaxTotalLevel =
  weaponProficiencyDefinitions.length * weaponProficiencyMaxLevel;

export const weaponProficiencyLevelOptions = Array.from(
  { length: weaponProficiencyMaxLevel - weaponProficiencyMinLevel + 1 },
  (_, index) => {
    const value = weaponProficiencyMinLevel + index;
    return {
      label: `Lv.${value}`,
      value,
    };
  }
);

const normalizeWeaponProficiencyLevel = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalizedValue = Math.round(value);

  if (normalizedValue < weaponProficiencyMinLevel) {
    return null;
  }

  return Math.min(weaponProficiencyMaxLevel, normalizedValue);
};

export function defaultWeaponProficiencyLevels(): WeaponProficiencyLevels {
  return {
    oneHandSword: null,
    rapier: null,
    club: null,
    dagger: null,
    axe: null,
    spear: null,
    bow: null,
    shield: null,
  };
}

export function normalizeWeaponProficiencyLevels(
  value?: Partial<Record<WeaponProficiencyKey, unknown>> | null
): WeaponProficiencyLevels {
  return {
    oneHandSword: normalizeWeaponProficiencyLevel(value?.oneHandSword),
    rapier: normalizeWeaponProficiencyLevel(value?.rapier),
    club: normalizeWeaponProficiencyLevel(value?.club),
    dagger: normalizeWeaponProficiencyLevel(value?.dagger),
    axe: normalizeWeaponProficiencyLevel(value?.axe),
    spear: normalizeWeaponProficiencyLevel(value?.spear),
    bow: normalizeWeaponProficiencyLevel(value?.bow),
    shield: normalizeWeaponProficiencyLevel(value?.shield),
  };
}

export function summarizeWeaponProficiencyProgress(
  value?: Partial<Record<WeaponProficiencyKey, unknown>> | null
) {
  const normalizedLevels = normalizeWeaponProficiencyLevels(value);

  const registeredCount = weaponProficiencyDefinitions.filter(
    ({ key }) => normalizedLevels[key] !== null
  ).length;

  const totalLevel = weaponProficiencyDefinitions.reduce(
    (total, { key }) => total + (normalizedLevels[key] ?? 0),
    0
  );

  const progressRate =
    weaponProficiencyMaxTotalLevel > 0
      ? (totalLevel / weaponProficiencyMaxTotalLevel) * 100
      : 0;

  return {
    registeredCount,
    totalLevel,
    progressRate,
  };
}

export function normalizeAttendanceFeatureVisibilityStatus(
  value: unknown
): AttendanceFeatureVisibilityStatus {
  return value === "visible" ? "visible" : "hidden";
}

export type AppUser = {
  /** Auth UID */
  uid: string;
  /** Login email */
  email: string;
  /** Display name */
  displayName: string;
  /** Display name in Kana */
  displayNameKana: string;
  /** Belonging guild ID */
  guildId: string;
  /** Belonging number inside guild */
  affiliationNum: number;
  /** Player situation */
  situation: "現役" | "隠居" | "引退" | "";
  /** Guild affiliation date */
  affiliationDate: Date | null;
  /** Game start date */
  gameStartDateAt: Date | null;
  /** Birth date */
  birthDateAt: Date | null;
  /** Contact phone */
  phone: string;
  /** Managed image URLs */
  imageUrls: string[];
  /** Weapon proficiency skill levels */
  weaponProficiencyLevels: WeaponProficiencyLevels;
  /** Weapon proficiency skill unlock progress */
  weaponProficiencySkillProgress: WeaponProficiencySkillProgress;
  /** Attendance feature visibility */
  attendanceFeatureVisibilityStatus: AttendanceFeatureVisibilityStatus;
  /** Access role */
  role: AppRole;
} & DefaultType;

export function defaultAppUser(): AppUser {
  return {
    id: "",
    createdAt: new Date(),
    createdBy: "",
    updatedAt: new Date(),
    updatedBy: "",
    uid: "",
    email: "",
    displayName: "",
    displayNameKana: "",
    guildId: "",
    affiliationNum: 0,
    situation: "現役",
    affiliationDate: null,
    gameStartDateAt: null,
    birthDateAt: null,
    phone: "",
    imageUrls: [],
    weaponProficiencyLevels: defaultWeaponProficiencyLevels(),
    weaponProficiencySkillProgress: defaultWeaponProficiencySkillProgress(),
    attendanceFeatureVisibilityStatus: "hidden",
    role: "member",
  };
}
