import Link from "next/link";
import { getDictionary, type Locale, localizePath } from "@/i18n";

export default async function DownloadPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  const t = getDictionary(locale).download;
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rx-red">Windows 10 / 11</p>
      <h1 className="mt-3 font-display text-5xl uppercase">{t.title}</h1>
      <p className="mt-4 text-white/65">{t.lead}</p>
      <ol className="mt-10 list-decimal space-y-3 pl-5 text-white/80">
        {t.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="mt-8 inline-block bg-white/10 px-5 py-3 text-sm text-white/50">{t.soon}</p>
      <p className="mt-6 text-sm text-white/50">
        {t.noAccount}{" "}
        <Link href={localizePath("/register", locale)} className="text-white">
          {t.trial}
        </Link>
      </p>
    </div>
  );
}
