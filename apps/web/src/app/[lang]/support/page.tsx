"use client";

import { useEffect, useState } from "react";
import { TicketForm } from "@/components/TicketForm";
import { clientApi } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import type { FaqArticle } from "@/lib/types";

export default function SupportPage() {
  const { d, locale } = useLocale();
  const t = d.support;
  const [faq, setFaq] = useState<FaqArticle[]>([]);

  useEffect(() => {
    void clientApi.listFaq(locale).then(setFaq).catch(() => setFaq([]));
  }, [locale]);

  return (
    <div className="mx-auto grid max-w-[1320px] gap-12 px-6 py-16 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl uppercase">{t.title}</h1>
        <p className="mt-3 text-white/70">{t.lead}</p>
        <div className="rx-cut relative mt-8 bg-gradient-to-br from-rx-red/50 via-white/10 to-rx-red/20 p-px">
          <div className="rx-cut bg-[linear-gradient(160deg,#130708_0%,#0b0b0e_50%,#09090b_100%)] p-6">
            <TicketForm />
          </div>
        </div>
      </div>
      <div>
        <h2 className="font-display text-2xl uppercase">{t.faqTitle}</h2>
        <ul className="mt-6 space-y-6">
          {faq.map((item) => (
            <li key={item.slug}>
              <h3 className="text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-white/70">{item.bodyMd}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
