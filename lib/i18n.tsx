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

  // === Лендинг ===
  'land.login': { ru: 'Войти', kz: 'Кіру', en: 'Log in' },
  'land.signup': { ru: 'Регистрация', kz: 'Тіркелу', en: 'Sign up' },
  'land.heroTitle': { ru: 'Бухгалтерские услуги в Казахстане', kz: 'Қазақстандағы бухгалтерлік қызметтер', en: 'Accounting Services in Kazakhstan' },
  'land.heroSubtitle': { ru: 'Найдите проверенного бухгалтера или разместите задачу. Быстро, надёжно, по всему Казахстану.', kz: 'Тексерілген бухгалтерді тауып, тапсырма орналастырыңыз. Жылдам, сенімді, бүкіл Қазақстан бойынша.', en: 'Find a verified accountant or post a task. Fast, reliable, across Kazakhstan.' },
  'land.findAccountant': { ru: 'Найти бухгалтера', kz: 'Бухгалтер табу', en: 'Find an Accountant' },
  'land.becomeAccountant': { ru: 'Стать бухгалтером', kz: 'Бухгалтер болу', en: 'Become an Accountant' },
  'land.iNeed': { ru: 'Мне нужно:', kz: 'Маған керек:', en: 'I need:' },
  'land.popularServices': { ru: 'Популярные услуги', kz: 'Танымал қызметтер', en: 'Popular Services' },
  'land.servicesSubtitle': { ru: 'Любая бухгалтерская задача — найдём специалиста', kz: 'Кез келген бухгалтерлік тапсырма — маман табамыз', en: 'Any accounting task — we will find a specialist' },
  'land.howItWorks': { ru: 'Как это работает', kz: 'Бұл қалай жұмыс істейді', en: 'How It Works' },
  'land.howSubtitle': { ru: 'Шесть простых шагов до решения вашей задачи', kz: 'Тапсырмаңызды шешудің алты қарапайым қадамы', en: 'Six simple steps to solve your task' },
  'land.whyUs': { ru: 'Почему BuhTask', kz: 'Неліктен BuhTask', en: 'Why BuhTask' },
  'land.ctaTitle': { ru: 'Готовы начать?', kz: 'Бастауға дайынсыз ба?', en: 'Ready to start?' },
  'land.ctaSubtitle': { ru: 'Присоединяйтесь к тысячам предпринимателей и бухгалтеров', kz: 'Мыңдаған кәсіпкерлер мен бухгалтерлерге қосылыңыз', en: 'Join thousands of entrepreneurs and accountants' },
  'land.getStarted': { ru: 'Начать бесплатно', kz: 'Тегін бастау', en: 'Get Started Free' },
  'land.hot': { ru: 'Популярное', kz: 'Танымал', en: 'Hot' },
  'land.stat.accountants': { ru: 'Проверенных бухгалтеров', kz: 'Тексерілген бухгалтерлер', en: 'Verified Accountants' },
  'land.stat.tasks': { ru: 'Выполненных задач', kz: 'Орындалған тапсырмалар', en: 'Completed Tasks' },
  'land.stat.services': { ru: 'Видов услуг', kz: 'Қызмет түрлері', en: 'Service Types' },
  'land.stat.regions': { ru: 'Регионов Казахстана', kz: 'Қазақстан өңірлері', en: 'Regions of Kazakhstan' },
  'land.why.verified': { ru: 'Проверенные специалисты', kz: 'Тексерілген мамандар', en: 'Verified Specialists' },
  'land.why.verifiedDesc': { ru: 'Все бухгалтеры проходят проверку документов и квалификации', kz: 'Барлық бухгалтерлер құжаттар мен біліктілік тексеруінен өтеді', en: 'All accountants undergo document and qualification verification' },
  'land.why.fast': { ru: 'Быстрый отклик', kz: 'Жылдам жауап', en: 'Fast Response' },
  'land.why.fastDesc': { ru: 'Получите предложения от специалистов в течение часа', kz: 'Бір сағат ішінде мамандардан ұсыныстар алыңыз', en: 'Get offers from specialists within an hour' },
  'land.why.secure': { ru: 'Безопасная оплата', kz: 'Қауіпсіз төлем', en: 'Secure Payment' },
  'land.why.secureDesc': { ru: 'Оплата через Kaspi только за результат', kz: 'Тек нәтиже үшін Kaspi арқылы төлем', en: 'Payment via Kaspi only for results' },
  'land.why.everywhere': { ru: 'Вся страна', kz: 'Бүкіл ел', en: 'Nationwide' },
  'land.why.everywhereDesc': { ru: 'Специалисты из всех регионов Казахстана', kz: 'Қазақстанның барлық өңірлерінен мамандар', en: 'Specialists from all regions of Kazakhstan' },

  // === Вход / регистрация ===
  'auth.loginTitle': { ru: 'Вход', kz: 'Кіру', en: 'Log in' },
  'auth.signupTitle': { ru: 'Регистрация', kz: 'Тіркелу', en: 'Sign up' },
  'auth.email': { ru: 'Email', kz: 'Email', en: 'Email' },
  'auth.password': { ru: 'Пароль', kz: 'Құпиясөз', en: 'Password' },
  'auth.fullName': { ru: 'Имя и фамилия', kz: 'Аты-жөні', en: 'Full Name' },
  'auth.iAm': { ru: 'Я —', kz: 'Мен —', en: 'I am —' },
  'auth.asClient': { ru: 'Заказчик', kz: 'Тапсырыс беруші', en: 'Client' },
  'auth.asAccountant': { ru: 'Бухгалтер', kz: 'Бухгалтер', en: 'Accountant' },
  'auth.loginBtn': { ru: 'Войти', kz: 'Кіру', en: 'Log in' },
  'auth.signupBtn': { ru: 'Зарегистрироваться', kz: 'Тіркелу', en: 'Sign up' },
  'auth.googleBtn': { ru: 'Продолжить с Google', kz: 'Google арқылы жалғастыру', en: 'Continue with Google' },
  'auth.haveAccount': { ru: 'Уже есть аккаунт?', kz: 'Аккаунтыңыз бар ма?', en: 'Already have an account?' },
  'auth.noAccount': { ru: 'Нет аккаунта?', kz: 'Аккаунтыңыз жоқ па?', en: 'No account?' },
  'auth.forgotPassword': { ru: 'Забыли пароль?', kz: 'Құпиясөзді ұмыттыңыз ба?', en: 'Forgot password?' },
  'auth.or': { ru: 'или', kz: 'немесе', en: 'or' },

  // Лендинг — hero и секции (детально)
  'land.badge': { ru: 'Маркетплейс бухгалтерских услуг Казахстана', kz: 'Қазақстанның бухгалтерлік қызметтер маркетплейсі', en: 'Kazakhstan Accounting Services Marketplace' },
  'land.hero1': { ru: 'Найти', kz: 'Бухгалтер', en: 'Find an' },
  'land.hero2': { ru: 'бухгалтера', kz: 'табу', en: 'accountant' },
  'land.hero3': { ru: 'просто и быстро', kz: 'оңай және жылдам', en: 'easily and fast' },
  'land.heroDesc': { ru: 'BuhTask — цифровая платформа, где предприниматели находят проверенных бухгалтеров и получают бухгалтерские услуги из любой точки Казахстана.', kz: 'BuhTask — кәсіпкерлер тексерілген бухгалтерлерді тауып, Қазақстанның кез келген нүктесінен бухгалтерлік қызмет алатын цифрлық платформа.', en: 'BuhTask is a digital platform where entrepreneurs find verified accountants and get accounting services from anywhere in Kazakhstan.' },
  'land.postTask': { ru: 'Разместить задачу', kz: 'Тапсырма орналастыру', en: 'Post a Task' },
  'land.imAccountant': { ru: 'Я бухгалтер — найти заказы', kz: 'Мен бухгалтермін — тапсырыс табу', en: "I'm an accountant — find orders" },
  'land.forExample': { ru: 'Например:', kz: 'Мысалы:', en: 'For example:' },
  'land.categories': { ru: 'Категории услуг', kz: 'Қызмет санаттары', en: 'Service Categories' },
  'land.startNow': { ru: 'Начните прямо сейчас', kz: 'Дәл қазір бастаңыз', en: 'Start Right Now' },
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
