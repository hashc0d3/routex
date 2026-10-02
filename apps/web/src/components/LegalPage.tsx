export function LegalPage({ draft, title, children }: { draft: string; title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-6 py-16 text-white/80">
      <p className="text-sm text-white/50">{draft}</p>
      <h1 className="!mb-6 font-display text-4xl uppercase text-white">{title}</h1>
      {children}
    </article>
  );
}
