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

  // === Дашборд заказчика ===
  'dash.allTasks': { ru: 'Все задачи', kz: 'Барлық тапсырмалар', en: 'All Tasks' },
  'dash.noTasks': { ru: 'У вас пока нет задач', kz: 'Сізде әзірге тапсырма жоқ', en: 'You have no tasks yet' },
  'dash.createFirst': { ru: 'Создать первую задачу', kz: 'Алғашқы тапсырманы құру', en: 'Create your first task' },
  'dash.dialogs': { ru: 'диалогов', kz: 'диалог', en: 'dialogs' },
  'dash.noDialogs': { ru: 'Нет активных диалогов', kz: 'Белсенді диалогтар жоқ', en: 'No active dialogs' },
  'dash.dialogsAppear': { ru: 'Диалоги появятся после выбора бухгалтера', kz: 'Бухгалтерді таңдағаннан кейін диалогтар пайда болады', en: 'Dialogs appear after choosing an accountant' },
  'dash.noMessages': { ru: 'Нет сообщений', kz: 'Хабарлама жоқ', en: 'No messages' },
  'dash.dropFile': { ru: 'Отпустите файл, чтобы прикрепить', kz: 'Тіркеу үшін файлды жіберіңіз', en: 'Drop file to attach' },
  'dash.writeMessage': { ru: 'Напишите сообщение...', kz: 'Хабарлама жазыңыз...', en: 'Write a message...' },
  'dash.accountant': { ru: 'Бухгалтер', kz: 'Бухгалтер', en: 'Accountant' },

  // Статусы задач
  'status.open': { ru: 'Открыта', kz: 'Ашық', en: 'Open' },
  'status.in_progress': { ru: 'В работе', kz: 'Жұмыста', en: 'In Progress' },
  'status.completed': { ru: 'Завершена', kz: 'Аяқталды', en: 'Completed' },
  'status.cancelled': { ru: 'Отменена', kz: 'Бас тартылды', en: 'Cancelled' },
  'status.paid': { ru: 'Оплачена', kz: 'Төленді', en: 'Paid' },

  // === Создание задачи ===
  'ct.title': { ru: 'Создать новую задачу', kz: 'Жаңа тапсырма құру', en: 'Create New Task' },
  'ct.subtitle': { ru: 'Бухгалтеры получат уведомление и смогут откликнуться', kz: 'Бухгалтерлер хабарлама алып, жауап бере алады', en: 'Accountants will be notified and can respond' },
  'ct.forCompany': { ru: 'Для какой компании?', kz: 'Қай компания үшін?', en: 'For which company?' },
  'ct.personalTask': { ru: '👤 Личная задача (без компании)', kz: '👤 Жеке тапсырма (компаниясыз)', en: '👤 Personal task (no company)' },
  'ct.noCompanyHint': { ru: 'Добавьте компанию в «Мои компании» — бухгалтер будет видеть её реквизиты для документов', kz: '«Менің компанияларым» бөліміне компания қосыңыз — бухгалтер құжаттар үшін деректемелерді көреді', en: 'Add a company in "My Companies" — the accountant will see its details for documents' },
  'ct.companyHint': { ru: 'Бухгалтер увидит реквизиты компании после одобрения заказа — для подготовки документов', kz: 'Бухгалтер тапсырыс бекітілгеннен кейін компания деректемелерін көреді — құжаттарды дайындау үшін', en: 'The accountant will see company details after order approval — for preparing documents' },
  'ct.category': { ru: 'Категория', kz: 'Санат', en: 'Category' },
  'ct.taskTitle': { ru: 'Название задачи', kz: 'Тапсырма атауы', en: 'Task Title' },
  'ct.titlePlaceholder': { ru: 'Например: Сдача отчёта 910 ФНО за 2 квартал', kz: 'Мысалы: 2 тоқсанға 910 ФНО есебін тапсыру', en: 'E.g.: Filing 910 tax report for Q2' },
  'ct.description': { ru: 'Описание', kz: 'Сипаттама', en: 'Description' },
  'ct.descPlaceholder': { ru: 'Опишите задачу: тип компании (ИП/ТОО), налоговый режим, детали...', kz: 'Тапсырманы сипаттаңыз: компания түрі (ЖК/ЖШС), салық режимі, мәліметтер...', en: 'Describe the task: company type, tax regime, details...' },
  'ct.deadline': { ru: 'Желаемый срок выполнения', kz: 'Қалаған орындау мерзімі', en: 'Desired Deadline' },
  'ct.priceHint': { ru: '💡 Цену предложат бухгалтеры в своих откликах', kz: '💡 Бағаны бухгалтерлер өз жауаптарында ұсынады', en: '💡 Accountants will propose prices in their offers' },
  'ct.city': { ru: 'Город', kz: 'Қала', en: 'City' },
  'ct.error': { ru: 'Не удалось создать задачу', kz: 'Тапсырманы құру мүмкін болмады', en: 'Failed to create task' },
  'ct.publish': { ru: 'Опубликовать задачу', kz: 'Тапсырманы жариялау', en: 'Publish Task' },
  'ct.publishing': { ru: 'Публикуем задачу...', kz: 'Тапсырма жарияланып жатыр...', en: 'Publishing task...' },

  // Категории задач (для селектора)
  'taskcat.tax': { ru: 'Налоговая отчётность', kz: 'Салық есептілігі', en: 'Tax Reporting' },
  'taskcat.construction': { ru: 'Строительство (КС-2, КС-3)', kz: 'Құрылыс (КС-2, КС-3)', en: 'Construction (KS-2, KS-3)' },
  'taskcat.maternity': { ru: 'Декретные и пособия', kz: 'Декреттік және жәрдемақылар', en: 'Maternity & Benefits' },
  'taskcat.unblock_account': { ru: 'Снятие ареста со счёта', kz: 'Шоттан тыйымды алу', en: 'Account Unblocking' },
  'taskcat.restore_accounting': { ru: 'Восстановление учёта', kz: 'Есепті қалпына келтіру', en: 'Accounting Restoration' },
  'taskcat.esf_snt': { ru: 'Выписка ЭСФ / СНТ', kz: 'ЭШФ / ТЖҚ жазу', en: 'E-Invoice / SNT' },
  'taskcat.kgd_notice': { ru: 'Ответ на уведомление КГД', kz: 'МКД хабарламасына жауап', en: 'Tax Notice Response' },
  'taskcat.tax_inspection': { ru: 'Помощь с налоговой проверкой', kz: 'Салық тексерісіне көмек', en: 'Tax Audit Help' },
  'taskcat.vat_return': { ru: 'Возврат НДС', kz: 'ҚҚС қайтару', en: 'VAT Refund' },
  'taskcat.declaration_250': { ru: 'Декларация 250/270', kz: '250/270 декларация', en: 'Declaration 250/270' },
  'taskcat.salary': { ru: 'Расчёт зарплаты', kz: 'Жалақы есептеу', en: 'Payroll' },
  'taskcat.register': { ru: 'Регистрация ИП/ТОО', kz: 'ЖК/ЖШС тіркеу', en: 'Registration' },
  'taskcat.closing': { ru: 'Закрытие ИП/ТОО', kz: 'ЖК/ЖШС жабу', en: 'Closure' },
  'taskcat.audit': { ru: 'Аудит', kz: 'Аудит', en: 'Audit' },
  'taskcat.report': { ru: 'Отчётность', kz: 'Есептілік', en: 'Reporting' },
  'taskcat.other': { ru: 'Другое', kz: 'Басқа', en: 'Other' },

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

  // Подзаголовки секций
  'land.categoriesSub': { ru: 'Найдите нужного специалиста — от регистрации бизнеса до полного аудита', kz: 'Қажетті маманды табыңыз — бизнесті тіркеуден толық аудитке дейін', en: 'Find the right specialist — from business registration to full audit' },
  'land.howSub': { ru: 'Шесть простых шагов от регистрации до выполненной задачи', kz: 'Тіркеуден орындалған тапсырмаға дейінгі алты қарапайым қадам', en: 'Six simple steps from registration to completed task' },
  'land.highDemand': { ru: '🔥 Высокий спрос', kz: '🔥 Жоғары сұраныс', en: '🔥 High Demand' },
  'land.findSpecialist': { ru: 'Найти специалиста', kz: 'Маман табу', en: 'Find Specialist' },
  'land.ctaDesc': { ru: 'Разместите первую задачу бесплатно или создайте профиль бухгалтера за 3 минуты.', kz: 'Алғашқы тапсырманы тегін орналастырыңыз немесе 3 минут ішінде бухгалтер профилін жасаңыз.', en: 'Post your first task for free or create an accountant profile in 3 minutes.' },
  'land.registerAccountant': { ru: 'Зарегистрироваться как бухгалтер', kz: 'Бухгалтер ретінде тіркелу', en: 'Register as Accountant' },

  // Статистика
  'land.statAccountants': { ru: 'Проверенных бухгалтеров', kz: 'Тексерілген бухгалтерлер', en: 'Verified Accountants' },
  'land.statTasks': { ru: 'Выполненных задач', kz: 'Орындалған тапсырмалар', en: 'Completed Tasks' },
  'land.statServices': { ru: 'Видов услуг', kz: 'Қызмет түрлері', en: 'Service Types' },
  'land.statRegions': { ru: 'Регионов Казахстана', kz: 'Қазақстан өңірлері', en: 'Regions of Kazakhstan' },

  // Для бухгалтеров
  'land.forAccountants': { ru: 'Для бухгалтеров', kz: 'Бухгалтерлерге', en: 'For Accountants' },
  'land.findClients1': { ru: 'Найдите клиентов', kz: 'Клиенттерді табыңыз', en: 'Find clients' },
  'land.findClients2': { ru: 'без посредников', kz: 'делдалсыз', en: 'without intermediaries' },
  'land.forAccDesc': { ru: 'Создайте профиль, получайте заявки от реальных предпринимателей по всему Казахстану.', kz: 'Профиль жасап, Қазақстан бойынша нақты кәсіпкерлерден өтінімдер алыңыз.', en: 'Create a profile, receive requests from real entrepreneurs across Kazakhstan.' },
  'land.accFeat1': { ru: 'Регистрация с указанием специализации', kz: 'Мамандануды көрсете отырып тіркелу', en: 'Registration with specialization' },
  'land.accFeat2': { ru: 'Просмотр задач по всему Казахстану', kz: 'Қазақстан бойынша тапсырмаларды қарау', en: 'Browse tasks across Kazakhstan' },
  'land.accFeat3': { ru: 'Система рейтингов и отзывов', kz: 'Рейтинг және пікір жүйесі', en: 'Rating and review system' },
  'land.accFeat4': { ru: 'Чат с заказчиками', kz: 'Тапсырыс берушілермен чат', en: 'Chat with clients' },
  'land.tasksCount': { ru: 'Задач', kz: 'Тапсырма', en: 'Tasks' },
  'land.reviewsCount': { ru: 'Отзывов', kz: 'Пікір', en: 'Reviews' },
  'land.ratingCount': { ru: 'Рейтинг', kz: 'Рейтинг', en: 'Rating' },
  'land.verifiedBadge': { ru: 'Проверен BuhTask', kz: 'BuhTask растаған', en: 'Verified by BuhTask' },
  'land.tasksLabel': { ru: 'задач', kz: 'тапсырма', en: 'tasks' },
  'land.newTasksAvailable': { ru: '3 новых задачи доступны прямо сейчас', kz: '3 жаңа тапсырма дәл қазір қолжетімді', en: '3 new tasks available right now' },
  'land.footerRights': { ru: '© 2026 BuhTask. Маркетплейс бухгалтерских услуг Казахстана.', kz: '© 2026 BuhTask. Қазақстанның бухгалтерлік қызметтер маркетплейсі.', en: '© 2026 BuhTask. Kazakhstan Accounting Services Marketplace.' },
  'land.footerTerms': { ru: 'Условия', kz: 'Шарттар', en: 'Terms' },
  'land.footerPrivacy': { ru: 'Конфиденциальность', kz: 'Құпиялылық', en: 'Privacy' },
  'land.footerContacts': { ru: 'Контакты', kz: 'Байланыс', en: 'Contacts' },

  // Категории услуг (16)
  'cat.taxReport': { ru: 'Налоговая отчётность', kz: 'Салық есептілігі', en: 'Tax Reporting' },
  'cat.taxReportDesc': { ru: 'Декларации, НДС, КПН, ИПН — сдача отчётности в срок', kz: 'Декларациялар, ҚҚС, КТС, ЖТС — есептілікті уақытында тапсыру', en: 'Declarations, VAT, CIT, PIT — timely reporting' },
  'cat.construction': { ru: 'КС-2 и КС-3 (строительство)', kz: 'КС-2 және КС-3 (құрылыс)', en: 'KS-2 and KS-3 (construction)' },
  'cat.constructionDesc': { ru: 'Акты выполненных работ и справки о стоимости для строительных фирм', kz: 'Құрылыс фирмалары үшін орындалған жұмыс актілері мен құн анықтамалары', en: 'Work completion acts and cost certificates for construction firms' },
  'cat.maternity': { ru: 'Декретные и пособия', kz: 'Декреттік және жәрдемақылар', en: 'Maternity & Benefits' },
  'cat.maternityDesc': { ru: 'Расчёт декретных, пособий по уходу, больничных для сотрудников и ИП', kz: 'Декреттік, күтім жәрдемақысы, ауру парағын есептеу', en: 'Maternity, childcare and sick leave calculations' },
  'cat.salary': { ru: 'Расчёт зарплаты', kz: 'Жалақы есептеу', en: 'Payroll Calculation' },
  'cat.salaryDesc': { ru: 'Расчёт ЗП, ОПВ, соцотчислений, ИПН и налогов', kz: 'Жалақы, МЗЖ, әлеуметтік аударымдар, ЖТС есептеу', en: 'Salary, pension, social and income tax calculations' },
  'cat.register': { ru: 'Регистрация ИП/ТОО', kz: 'ЖК/ЖШС тіркеу', en: 'Sole Prop/LLP Registration' },
  'cat.registerDesc': { ru: 'Открытие бизнеса под ключ: документы, постановка на учёт', kz: 'Бизнесті кілт тапсыру: құжаттар, есепке қою', en: 'Turnkey business setup: documents, registration' },
  'cat.audit': { ru: 'Аудит', kz: 'Аудит', en: 'Audit' },
  'cat.auditDesc': { ru: 'Проверка финансовой отчётности, выявление ошибок', kz: 'Қаржылық есептілікті тексеру, қателерді анықтау', en: 'Financial statement review, error detection' },
  'cat.kgdNotice': { ru: 'Ответ на уведомление КГД', kz: 'МКД хабарламасына жауап', en: 'Response to Tax Notice' },
  'cat.kgdNoticeDesc': { ru: 'Камеральный контроль, ответы на уведомления налоговой, разблокировка счетов', kz: 'Камералдық бақылау, салық хабарламаларына жауап, шоттарды бұғаттан шығару', en: 'Desk audit, tax notice responses, account unblocking' },
  'cat.unblock': { ru: 'Снятие ареста со счёта', kz: 'Шоттан тыйымды алу', en: 'Account Unblocking' },
  'cat.unblockDesc': { ru: 'Разблокировка арестованных счетов ИП и ТОО, работа с налоговой', kz: 'ЖК және ЖШС бұғатталған шоттарын ашу, салықпен жұмыс', en: 'Unblocking seized accounts, working with tax authority' },
  'cat.restore': { ru: 'Восстановление учёта', kz: 'Есепті қалпына келтіру', en: 'Accounting Restoration' },
  'cat.restoreDesc': { ru: 'Восстановление бухгалтерии за прошлые периоды, архивирование документов', kz: 'Өткен кезеңдер бухгалтериясын қалпына келтіру, құжаттарды архивтеу', en: 'Restoring past period accounting, document archiving' },
  'cat.esf': { ru: 'Выписка ЭСФ / СНТ', kz: 'ЭШФ / ТЖҚ жазу', en: 'E-Invoice / SNT Issuance' },
  'cat.esfDesc': { ru: 'Электронные счета-фактуры, сопроводительные накладные, приход ГТД', kz: 'Электрондық шот-фактуралар, ілеспе жүкқұжаттар, КЖД кірісі', en: 'E-invoices, accompanying waybills, customs declarations' },
  'cat.taxInspection': { ru: 'Помощь с налоговой проверкой', kz: 'Салық тексерісіне көмек', en: 'Tax Audit Assistance' },
  'cat.taxInspectionDesc': { ru: 'Сопровождение камеральных и налоговых проверок по новым правилам 2026', kz: '2026 жаңа ережелері бойынша салық тексерістерін сүйемелдеу', en: 'Support for tax audits under new 2026 rules' },
  'cat.vatReturn': { ru: 'Возврат НДС', kz: 'ҚҚС қайтару', en: 'VAT Refund' },
  'cat.vatReturnDesc': { ru: 'Возврат превышения НДС, работа с КГД по возврату', kz: 'ҚҚС асып кетуін қайтару, МКД-мен қайтару бойынша жұмыс', en: 'VAT excess refund, working with tax authority' },
  'cat.closing': { ru: 'Закрытие ИП/ТОО', kz: 'ЖК/ЖШС жабу', en: 'Business Closure' },
  'cat.closingDesc': { ru: 'Ликвидация без штрафов, прохождение камерального контроля', kz: 'Айыппұлсыз тарату, камералдық бақылаудан өту', en: 'Liquidation without fines, passing desk audit' },
  'cat.declaration': { ru: 'Декларация 250/270', kz: '250/270 декларация', en: 'Declaration 250/270' },
  'cat.declarationDesc': { ru: 'Декларация об активах и обязательствах, всеобщее декларирование', kz: 'Активтер мен міндеттемелер декларациясы, жалпыға бірдей декларациялау', en: 'Assets and liabilities declaration, universal declaration' },
  'cat.consult': { ru: 'Консультация', kz: 'Кеңес беру', en: 'Consultation' },
  'cat.consultDesc': { ru: 'Разовый вопрос или регулярное налоговое сопровождение', kz: 'Бір реттік сұрақ немесе тұрақты салықтық сүйемелдеу', en: 'One-time question or regular tax support' },
  'cat.bookkeeping': { ru: 'Ведение бухгалтерии', kz: 'Бухгалтерлік есеп жүргізу', en: 'Bookkeeping' },
  'cat.bookkeepingDesc': { ru: 'Полное ведение учёта: первичка, проводки, отчётность', kz: 'Толық есеп жүргізу: алғашқы құжаттар, өткізбелер, есептілік', en: 'Full accounting: primary docs, entries, reporting' },

  // Шаги
  'step.1': { ru: 'Зарегистрируйтесь', kz: 'Тіркеліңіз', en: 'Register' },
  'step.1desc': { ru: 'Создайте аккаунт как заказчик или бухгалтер', kz: 'Тапсырыс беруші немесе бухгалтер ретінде аккаунт жасаңыз', en: 'Create an account as client or accountant' },
  'step.2': { ru: 'Создайте задачу', kz: 'Тапсырма жасаңыз', en: 'Create a Task' },
  'step.2desc': { ru: 'Опишите задачу, укажите бюджет и сроки', kz: 'Тапсырманы сипаттап, бюджет пен мерзімді көрсетіңіз', en: 'Describe the task, set budget and deadline' },
  'step.3': { ru: 'Получите отклики', kz: 'Жауаптар алыңыз', en: 'Get Responses' },
  'step.3desc': { ru: 'Проверенные бухгалтеры пришлют предложения', kz: 'Тексерілген бухгалтерлер ұсыныс жібереді', en: 'Verified accountants will send offers' },
  'step.4': { ru: 'Выберите исполнителя', kz: 'Орындаушыны таңдаңыз', en: 'Choose a Provider' },
  'step.4desc': { ru: 'Изучите профили, рейтинги и отзывы', kz: 'Профильдерді, рейтингтерді және пікірлерді қараңыз', en: 'Review profiles, ratings and reviews' },
  'step.5': { ru: 'Работайте онлайн', kz: 'Онлайн жұмыс істеңіз', en: 'Work Online' },
  'step.5desc': { ru: 'Общайтесь в чате, отслеживайте статус', kz: 'Чатта сөйлесіп, статусты қадағалаңыз', en: 'Chat and track status' },
  'step.6': { ru: 'Оплатите результат', kz: 'Нәтиже үшін төлеңіз', en: 'Pay for Results' },
  'step.6desc': { ru: 'Быстрая и безопасная оплата через Kaspi', kz: 'Kaspi арқылы жылдам әрі қауіпсіз төлем', en: 'Fast and secure payment via Kaspi' },
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
