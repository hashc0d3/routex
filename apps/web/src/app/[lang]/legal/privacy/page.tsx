import { LegalPage } from "@/components/LegalPage";
import { getDictionary, type Locale } from "@/i18n";

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l = getDictionary(lang as Locale).legal;
  return (
    <LegalPage draft={l.draft} title={l.privacy.title}>
      {l.privacy.p.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </LegalPage>
  );
}
