/** Тексты тарифов — в словарях `d.plans[id]`. */
export const PLANS = [
  { id: "trial", code: "trial_3d", popular: false },
  { id: "pro", code: "pro_month", popular: true },
  { id: "year", code: "pro_year", popular: false },
] as const;
