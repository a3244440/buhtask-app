'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Lang = 'ru' | 'kz' | 'en';

// Словари переводов
const translations: Record<string, Record<Lang, string>> = {
  // Общие
  'app.tagline': { ru: 'Маркетплейс бухгалтерских услуг', kz: 'Бухгалтерлік қызметтер маркетплейсі', en: 'Accounting Services Marketplace' },
  'nav.home': { ru: 'Главная', kz: 'Басты бет', en: 'Home' },
  'nav.tasks': { ru: 'Мои задачи', kz: 'Менің тапсырмаларым', en: 'My Tasks' },
  'nav.messages': { ru: 'Сообщения', kz: 'Хабарламалар', en: 'Messages' },
  'nav.tools': { ru: 'Инструменты', kz: 'Құралдар', en: 'Tools' },
  'nav.availableTasks': { ru: 'Доступные задачи', kz: 'Қолжетімді тапсырмалар', en: 'Available Tasks' },
  'nav.myOrders': { ru: 'Мои заказы', kz: 'Менің тапсырыстарым', en: 'My Orders' },
  'nav.balance': { ru: 'Баланс и комиссии', kz: 'Баланс және комиссиялар', en: 'Balance & Fees' },
  'nav.findTasks': { ru: 'Найти задачи', kz: 'Тапсырма табу', en: 'Find Tasks' },
  'nav.newTask': { ru: 'Новая задача', kz: 'Жаңа тапсырма', en: 'New Task' },

  // Инструменты
  'tools.title': { ru: 'Инструменты', kz: 'Құралдар', en: 'Tools' },
  'tools.companies': { ru: 'Мои компании', kz: 'Менің компанияларым', en: 'My Companies' },
  'tools.documents': { ru: 'Документы', kz: 'Құжаттар', en: 'Documents' },
  'tools.taxCalendar': { ru: 'Налоговый календарь', kz: 'Салық күнтізбесі', en: 'Tax Calendar' },
  'tools.salaryCalc': { ru: 'Калькулятор зарплаты', kz: 'Жалақы калькуляторы', en: 'Salary Calculator' },
  'tools.finance': { ru: 'Финансовая аналитика', kz: 'Қаржылық талдау', en: 'Financial Analytics' },
  'tools.companiesDesc': { ru: 'Реквизиты ваших компаний', kz: 'Компанияларыңыздың деректемелері', en: 'Your companies details' },
  'tools.documentsDesc': { ru: 'Счета, акты, счета-фактуры', kz: 'Шоттар, актілер, шот-фактуралар', en: 'Invoices, acts, tax invoices' },
  'tools.taxCalendarDesc': { ru: 'Сроки сдачи отчётности', kz: 'Есеп беру мерзімдері', en: 'Reporting deadlines' },
  'tools.salaryCalcDesc': { ru: 'Расчёт налогов с ЗП', kz: 'Жалақыдан салық есептеу', en: 'Payroll tax calculation' },
  'tools.financeDesc': { ru: 'Доходы, расходы, прибыль', kz: 'Кірістер, шығыстар, пайда', en: 'Income, expenses, profit' },

  // Профиль/меню
  'menu.profile': { ru: 'Мой профиль', kz: 'Менің профилім', en: 'My Profile' },
  'menu.admin': { ru: 'Админ', kz: 'Әкімші', en: 'Admin' },
  'menu.settings': { ru: 'Настройки', kz: 'Параметрлер', en: 'Settings' },
  'menu.logout': { ru: 'Выйти', kz: 'Шығу', en: 'Log out' },
  'menu.personal': { ru: 'Личный кабинет', kz: 'Жеке кабинет', en: 'Personal Account' },
  'menu.selectOrg': { ru: 'ВЫБЕРИТЕ ОРГАНИЗАЦИЮ', kz: 'ҰЙЫМДЫ ТАҢДАҢЫЗ', en: 'SELECT ORGANIZATION' },
  'menu.manageCompanies': { ru: 'Управление компаниями', kz: 'Компанияларды басқару', en: 'Manage Companies' },

  // Роли
  'role.client': { ru: 'Заказчик', kz: 'Тапсырыс беруші', en: 'Client' },
  'role.accountant': { ru: 'Бухгалтер', kz: 'Бухгалтер', en: 'Accountant' },

  // Дашборд статы
  'stat.totalTasks': { ru: 'Всего задач', kz: 'Барлық тапсырмалар', en: 'Total Tasks' },
  'stat.open': { ru: 'Открытые', kz: 'Ашық', en: 'Open' },
  'stat.inProgress': { ru: 'В работе', kz: 'Жұмыста', en: 'In Progress' },
  'stat.recentTasks': { ru: 'Последние задачи', kz: 'Соңғы тапсырмалар', en: 'Recent Tasks' },

  // Кнопки общие
  'btn.save': { ru: 'Сохранить', kz: 'Сақтау', en: 'Save' },
  'btn.cancel': { ru: 'Отмена', kz: 'Болдырмау', en: 'Cancel' },
  'btn.delete': { ru: 'Удалить', kz: 'Жою', en: 'Delete' },
  'btn.add': { ru: 'Добавить', kz: 'Қосу', en: 'Add' },
  'btn.create': { ru: 'Создать', kz: 'Құру', en: 'Create' },
  'btn.edit': { ru: 'Редактировать', kz: 'Өңдеу', en: 'Edit' },
  'btn.back': { ru: 'Назад', kz: 'Артқа', en: 'Back' },
  'btn.print': { ru: 'Печать / PDF', kz: 'Басып шығару / PDF', en: 'Print / PDF' },

  // Документы
  'doc.title': { ru: 'Документы', kz: 'Құжаттар', en: 'Documents' },
  'doc.subtitle': { ru: 'Счета, акты и счета-фактуры', kz: 'Шоттар, актілер және шот-фактуралар', en: 'Invoices, acts and tax invoices' },
  'doc.counterparties': { ru: 'Контрагенты', kz: 'Контрагенттер', en: 'Counterparties' },
  'doc.createInvoice': { ru: 'Создать счёт', kz: 'Шот құру', en: 'Create Invoice' },
  'doc.all': { ru: 'Все', kz: 'Барлығы', en: 'All' },
  'doc.invoices': { ru: 'Счета', kz: 'Шоттар', en: 'Invoices' },
  'doc.avr': { ru: 'АВР', kz: 'ОЖА', en: 'Acts' },
  'doc.sf': { ru: 'Счета-фактуры', kz: 'Шот-фактуралар', en: 'Tax Invoices' },
  'doc.noDocuments': { ru: 'Нет документов', kz: 'Құжаттар жоқ', en: 'No documents' },

  // Компании
  'company.title': { ru: 'Мои компании', kz: 'Менің компанияларым', en: 'My Companies' },
  'company.add': { ru: 'Добавить компанию', kz: 'Компания қосу', en: 'Add Company' },
  'company.name': { ru: 'Наименование', kz: 'Атауы', en: 'Name' },
  'company.director': { ru: 'Директор', kz: 'Директор', en: 'Director' },
  'company.address': { ru: 'Адрес', kz: 'Мекенжай', en: 'Address' },

  // Финансы
  'finance.title': { ru: 'Финансы', kz: 'Қаржы', en: 'Finance' },
  'finance.income': { ru: 'Доходы', kz: 'Кірістер', en: 'Income' },
  'finance.expense': { ru: 'Расходы', kz: 'Шығыстар', en: 'Expenses' },
  'finance.profit': { ru: 'Чистая прибыль', kz: 'Таза пайда', en: 'Net Profit' },
  'finance.addIncome': { ru: 'Добавить доход', kz: 'Кіріс қосу', en: 'Add Income' },
  'finance.addExpense': { ru: 'Добавить расход', kz: 'Шығыс қосу', en: 'Add Expense' },
  'finance.month': { ru: 'Месяц', kz: 'Ай', en: 'Month' },
  'finance.allTime': { ru: 'Всё время', kz: 'Барлық уақыт', en: 'All Time' },
  'finance.period': { ru: 'Период', kz: 'Кезең', en: 'Period' },
  'finance.byCategory': { ru: 'Расходы по категориям', kz: 'Санаттар бойынша шығыстар', en: 'Expenses by Category' },
};

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({ lang: 'ru', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? localStorage.getItem('buhtask_lang') : null) as Lang | null;
    if (saved && ['ru', 'kz', 'en'].includes(saved)) setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('buhtask_lang', l);
  };

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.ru || key;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
