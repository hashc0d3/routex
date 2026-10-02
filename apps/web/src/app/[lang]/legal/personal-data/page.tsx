import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { getDictionary, type Locale, localizePath } from "@/i18n";

export default async function PersonalDataPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  const l = getDictionary(locale).legal;
  return (
    <LegalPage draft={l.draft} title={l.personalData.title}>
      <p>{l.personalData.p1}</p>
      <p>
        {l.personalData.p2before} <Link href={localizePath("/account", locale)}>{l.personalData.p2link}</Link>
        {l.personalData.p2after}
      </p>
    </LegalPage>
  );
}
