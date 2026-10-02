"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";

export function Faq() {
  const { d } = useLocale();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-white/10 border-y border-white/10">
      {d.faq.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q}>
            <button
              type="button"
              aria-expanded={isOpen}
              className="group flex w-full items-center justify-between gap-4 py-5 text-left"
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="font-medium transition group-hover:text-white/80">{item.q}</span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center border text-rx-red transition duration-300 ${
                  isOpen ? "rotate-45 border-rx-red" : "border-white/15"
                }`}
              >
                <svg viewBox="0 0 12 12" width={12} height={12} aria-hidden className="block">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth={1.75} />
                </svg>
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <p className="overflow-hidden pb-0 text-sm text-white/65">
                <span className="block pb-5">{item.a}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
