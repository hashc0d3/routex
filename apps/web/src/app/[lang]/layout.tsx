import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { notFound } from "next/navigation";
import { AnchorNavigation } from "@/components/AnchorNavigation";
import { ConsentBanner } from "@/components/ConsentBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SupportWidget } from "@/components/SupportWidget";
import { getDictionary, isLocale, LOCALES } from "@/i18n";
import { LocaleProvider } from "@/lib/i18n";
import { NotificationsProvider } from "@/lib/notifications";
import { SessionProvider } from "@/lib/session";
import "../globals.css";

const inter = Inter({
  subsets: ["cyrillic", "latin"],
  variable: "--font-sans",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["cyrillic", "latin"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
};

export function generateStaticParams() {
  return LOCALES.map((l) => ({ lang: l.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return {
    title: d.meta.title,
    description: d.meta.description,
    alternates: { languages: { ru: "/", en: "/en" } },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang}>
      <body className={`${inter.variable} ${oswald.variable} font-sans`}>
        <noscript>
          <style>{".rx-reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <LocaleProvider locale={lang}>
          <SessionProvider>
            <NotificationsProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <SupportWidget />
              <ConsentBanner />
              <AnchorNavigation />
            </NotificationsProvider>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
