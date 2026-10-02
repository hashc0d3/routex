import { LegalPage } from "@/components/LegalPage";
import { getDictionary, type Locale } from "@/i18n";

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l = getDictionary(lang as Locale).legal;
  return (
    <LegalPage draft={l.draft} title={l.terms.title}>
      {l.terms.p.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </LegalPage>
  );
}
