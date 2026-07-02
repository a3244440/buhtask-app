// Тарифы и их лимиты. Используется для проверки лимитов и активации.

export type PlanKey = 'free' | 'business' | 'pro';

// === ПРОМО-ПЕРИОД (Astana Hub) ===
// Пока true — всем пользователям бесплатно выдаётся полный тариф PRO.
// После подключения оплаты поставить false, чтобы вернуть обычные тарифы.
export const PROMO_ALL_PRO = true;

export interface PlanLimits {
  companies: number;      // макс компаний (Infinity = без лимита)
  docsPerCompany: number; // макс документов на компанию
  price: number;          // ₸/мес
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free:     { companies: 2,        docsPerCompany: 10,       price: 0 },
  business: { companies: 10,       docsPerCompany: 100,      price: 4990 },
  pro:      { companies: Infinity, docsPerCompany: Infinity, price: 9990 },
};

// Активен ли тариф (с учётом срока действия)
export function activePlan(plan?: string | null, until?: string | null): PlanKey {
  if (PROMO_ALL_PRO) return 'pro'; // промо: всем PRO
  const p = (plan || 'free') as PlanKey;
  if (p === 'free') return 'free';
  if (until && new Date(until) < new Date()) return 'free'; // срок истёк
  return PLAN_LIMITS[p] ? p : 'free';
}

export function getLimits(plan?: string | null, until?: string | null): PlanLimits {
  return PLAN_LIMITS[activePlan(plan, until)];
}
