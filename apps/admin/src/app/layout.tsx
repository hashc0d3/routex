import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["cyrillic", "latin"], variable: "--font-sans", display: "swap" });
const oswald = Oswald({ subsets: ["cyrillic", "latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "RouteX Admin", template: "%s · RouteX Admin" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${oswald.variable} font-sans`}>{children}</body>
    </html>
  );
}
