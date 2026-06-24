import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "BuhTask - Маркетплейс бухгалтерских услуг",
  description: "Платформа для поиска бухгалтеров и размещения бухгалтерских задач в Казахстане",
  icons: {
    icon: '/images/logo-new.png',
    apple: '/images/logo-new.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "Inter, sans-serif", margin: 0, padding: 0, background: "#F8FAFC" }}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
