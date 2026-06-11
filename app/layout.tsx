import type { Metadata } from "next";
import "./globals.css";
import NavWrapper from "./components/NavWrapper";

export const metadata: Metadata = {
  title: "BuhTask - Маркетплейс бухгалтерских услуг",
  description: "Платформа для поиска бухгалтеров и размещения бухгалтерских задач в Казахстане",
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
          <NavWrapper />
          {children}
          {/* FOOTER */}
          <footer className="border-t border-border py-10 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center">
                <img src="/images/logo.png" alt="BuhTask" className="h-8 w-auto" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                © 2026 BuhTask. Маркетплейс бухгалтерских услуг Казахстана.
              </p>
              <div className="flex gap-5">
                {["Условия", "Конфиденциальность", "Контакты"].map((l) => (
                  <a key={l} href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                    {l}
                  </a>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
