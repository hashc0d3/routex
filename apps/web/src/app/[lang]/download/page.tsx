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
      <a
        href="/downloads/RouteX-win-x64.zip"
        className="rx-cut mt-8 inline-flex items-center gap-3 bg-rx-red px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-rx-red2"
      >
        {t.windows}
        <span className="text-xs font-normal normal-case tracking-normal text-white/70">{t.windowsMeta}</span>
      </a>
      <p className="mt-3 text-xs text-white/40">{t.note}</p>
      <p className="mt-6 text-sm text-white/50">
        {t.noAccount}{" "}
        <Link href={localizePath("/register", locale)} className="text-white">
          {t.trial}
        </Link>
      </p>
    </div>
  );
}
