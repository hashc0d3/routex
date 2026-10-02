import type { MetadataRoute } from "next";
import { LOCALES, localizePath } from "@/i18n/config";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/download", priority: 0.9, changeFrequency: "monthly" },
  { path: "/register", priority: 0.7, changeFrequency: "yearly" },
  { path: "/support", priority: 0.5, changeFrequency: "monthly" },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/personal-data", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.flatMap(({ path, priority, changeFrequency }) => {
    const languages = Object.fromEntries(LOCALES.map((l) => [l.code, SITE_URL + localizePath(path, l.code)]));
    return LOCALES.map((l) => ({
      url: SITE_URL + localizePath(path, l.code),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
