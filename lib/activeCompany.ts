// Хранение активной компании (как в 1С — выбранная организация)
const KEY = 'buhtask_active_company';

export function getActiveCompany(): string {
  if (typeof window === 'undefined') return 'personal';
  return localStorage.getItem(KEY) || 'personal';
}

export function setActiveCompany(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, id);
  // Уведомляем другие компоненты об изменении
  window.dispatchEvent(new CustomEvent('active-company-changed', { detail: id }));
}
