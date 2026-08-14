import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://buhtask.kz"),
  title: {
    default: "BuhTask — найти бухгалтера в Казахстане | Бухгалтерские услуги и инструменты",
    template: "%s | BuhTask",
  },
  description:
    "Маркетплейс бухгалтерских услуг №1 в Казахстане: найдите проверенного бухгалтера для ИП и ТОО, сдача налоговой отчётности (910, 200, 300), открытие и закрытие ИП/ТОО, расчёт зарплаты и налогов. Бесплатные инструменты: доход для 910 из выписки, налоговый календарь 2026, калькуляторы.",
  keywords: [
    "бухгалтерские услуги", "бухгалтерские услуги Астана", "бухгалтерские услуги Алматы", "услуги бухгалтера",
    "бухгалтер Астана", "бухгалтер Алматы", "бухгалтер Шымкент", "аутсорсинг бухгалтерии", "бухгалтерское сопровождение",
    "ведение бухгалтерского учета", "бухгалтерское обслуживание", "удаленный бухгалтер", "бухгалтер онлайн",
    "налоговая отчетность", "сдать отчет", "отчет 910", "отчет 200", "отчет 300", "декларация НДС", "постановка на НДС",
    "расчет заработной платы", "кадровый учет", "восстановление бухгалтерского учета", "консультация бухгалтера",
    "стоимость бухгалтерских услуг", "регистрация ТОО", "регистрация ИП", "срочно нужен бухгалтер",
    "бухгалтер Казахстан", "найти бухгалтера", "бухгалтерские услуги", "бухгалтер для ИП",
    "бухгалтер для ТОО", "бухгалтер удаленно", "сдача налоговой отчетности", "форма 910",
    "упрощенка Казахстан", "открыть ИП Казахстан", "закрыть ИП", "открытие ТОО",
    "ликвидация ТОО", "налоги ИП 2026", "налоговый календарь 2026", "калькулятор зарплаты РК",
    "декретный калькулятор", "акт сверки", "ЭСФ", "аутсорсинг бухгалтерии",
  ],
  alternates: { canonical: "https://buhtask.kz" },
  openGraph: {
    type: "website",
    url: "https://buhtask.kz",
    siteName: "BuhTask",
    title: "BuhTask — найти бухгалтера в Казахстане",
    description:
      "Проверенные бухгалтеры для ИП и ТОО, сдача отчётности, открытие/закрытие бизнеса и бесплатные налоговые инструменты 2026.",
    locale: "ru_KZ",
    images: [{ url: "/images/logo-new.png", width: 512, height: 512, alt: "BuhTask" }],
  },
  twitter: {
    card: "summary",
    title: "BuhTask — найти бухгалтера в Казахстане",
    description: "Маркетплейс бухгалтеров и бесплатные налоговые инструменты для бизнеса РК.",
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  icons: {
    icon: "/images/logo-new.png",
    apple: "/images/logo-new.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://buhtask.kz/#org",
      name: "BuhTask",
      url: "https://buhtask.kz",
      logo: "https://buhtask.kz/images/logo-new.png",
      email: "info@buhtask.kz",
      description: "Маркетплейс бухгалтерских услуг и бесплатные налоговые инструменты для бизнеса Казахстана",
      areaServed: { "@type": "Country", name: "Kazakhstan" },
    },
    {
      "@type": "WebSite",
      "@id": "https://buhtask.kz/#website",
      url: "https://buhtask.kz",
      name: "BuhTask",
      publisher: { "@id": "https://buhtask.kz/#org" },
      inLanguage: "ru",
    },
    {
      "@type": "Service",
      name: "Поиск бухгалтера и бухгалтерские услуги в Казахстане",
      provider: { "@id": "https://buhtask.kz/#org" },
      serviceType: "Бухгалтерские услуги, сдача налоговой отчётности, открытие и закрытие ИП/ТОО",
      areaServed: { "@type": "Country", name: "Kazakhstan" },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Yandex.Metrika counter */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110500420', 'ym');
    ym(110500420, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {/* Применяем сохранённую тему до первой отрисовки — без мигания светлой темой */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
    (function() {
      try {
        var saved = localStorage.getItem('buhtask_theme');
        var dark;
        if (saved) { dark = saved === 'dark'; }
        else {
          var now = new Date();
          var utc = now.getTime() + now.getTimezoneOffset() * 60000;
          var h = new Date(utc + 5 * 3600000).getHours();
          dark = h >= 19 || h < 9;
        }
        if (dark) document.documentElement.classList.add('dark');
      } catch (e) {}
    })();
            `,
          }}
        />
      </head>
      <body style={{ fontFamily: "Inter, sans-serif", margin: 0, padding: 0 }} className="bg-[var(--background)]">
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/110500420" style={{ position: 'absolute', left: '-9999px' }} alt="" />
          </div>
        </noscript>
        <I18nProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
