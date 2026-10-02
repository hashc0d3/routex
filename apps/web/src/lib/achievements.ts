import type { Loyalty } from "./types";

export type AchievementDef = {
  code: string;
  months: number;
};

/** Названия и описания — в словарях `d.achievements[code]`. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "months_1", months: 1 },
  { code: "months_3", months: 3 },
  { code: "months_6", months: 6 },
  { code: "months_12", months: 12 },
  { code: "months_24", months: 24 },
  { code: "months_36", months: 36 },
];

export const NICKNAME_MAX = 24;
/** 3–24 символа: буквы, цифры, «_ . -» и одиночные пробелы между словами. */
export const NICKNAME_RE = /^(?=.{3,24}$)[A-Za-zА-Яа-яЁё0-9_.-]+(?: [A-Za-zА-Яа-яЁё0-9_.-]+)*$/;

export function nicknameError(nickname: string): "nickname_invalid" | null {
  return NICKNAME_RE.test(nickname.trim()) ? null : "nickname_invalid";
}

export function unlockedCodesFor(months: number): string[] {
  return ACHIEVEMENTS.filter((a) => months >= a.months).map((a) => a.code);
}

export function achievementState(loyalty: Loyalty) {
  const unlocked = new Map(loyalty.unlocked.map((u) => [u.code, u.unlockedAt]));
  const items = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlockedAt: unlocked.get(a.code) ?? null,
  }));
  const next = items.find((a) => !a.unlockedAt) ?? null;
  const prevMonths = [...items].reverse().find((a) => a.unlockedAt)?.months ?? 0;
  const progress = next
    ? Math.min(1, (loyalty.monthsTogether - prevMonths) / (next.months - prevMonths))
    : 1;
  const top = [...items].reverse().find((a) => a.unlockedAt) ?? null;
  return { items, next, progress, top };
}
