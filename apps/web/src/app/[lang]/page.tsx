import Image from "next/image";
import { CtaButton } from "@/components/CtaButton";
import { Faq } from "@/components/Faq";
import { GamesMarquee } from "@/components/GamesMarquee";
import {
  CardOffIcon,
  HistoryIcon,
  MultipathIcon,
  PulseIcon,
  QuoteIcon,
  RouteIcon,
  ShieldIcon,
  SplitIcon,
  StarIcon,
  UndoIcon,
  WindowsIcon,
} from "@/components/icons";
import { Pricing } from "@/components/Pricing";
import { Reveal } from "@/components/Reveal";
import { RouteCard } from "@/components/RouteCard";
import { getDictionary, type Locale, localizePath } from "@/i18n";
import arenaBg from "../../../public/images/arena-bg.jpg";
import gamerBg from "../../../public/images/gamer-bg.jpg";
import heroBg from "../../../public/images/hero-bg.jpg";

const HERO_NOTE_ICONS = [CardOffIcon, WindowsIcon, UndoIcon];
const FEATURE_ICONS = [MultipathIcon, RouteIcon, SplitIcon, PulseIcon, HistoryIcon, ShieldIcon];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rx-red">{children}</p>;
}

const num = (i: number) => String(i + 1).padStart(2, "0");

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  const d = getDictionary(locale);
  const h = d.home;
  const href = (path: string) => localizePath(path, locale);

  return (
    <div className="overflow-x-clip">
      <section className="relative flex flex-col lg:h-[calc(100dvh-var(--header-h))] lg:min-h-[600px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src={heroBg}
            alt=""
            fill
            priority
            quality={60}
            placeholder="blur"
            sizes="100vw"
            className="animate-slow-zoom object-cover object-[70%_50%] opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-rx-black via-rx-black/85 to-rx-black/30" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-rx-black to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-rx-black to-transparent" />
        </div>
        <div className="rx-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[720px] animate-glow bg-[radial-gradient(circle,rgba(225,6,0,0.22),transparent_60%)]" />
        <div className="relative mx-auto my-auto grid w-full max-w-[1320px] items-center gap-12 px-5 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-6">
          <div>
            <div className="animate-fade-up">
              <Eyebrow>{h.eyebrow}</Eyebrow>
            </div>
            <h1
              className="mt-5 animate-fade-up font-display text-5xl uppercase leading-[0.95] md:text-7xl"
              style={{ animationDelay: "80ms" }}
            >
              {h.title1}
              <span className="block text-rx-red">
                <span className="rx-glitch" data-text={h.title2}>
                  {h.title2}
                </span>
              </span>
            </h1>
            <p className="mt-6 max-w-lg animate-fade-up text-lg text-white/70" style={{ animationDelay: "160ms" }}>
              {h.lead}
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <CtaButton href={href("/download")}>{h.ctaTrial}</CtaButton>
              <CtaButton href={href("/#how")} variant="ghost" arrow={false}>
                {h.ctaHow}
              </CtaButton>
            </div>
            <ul
              className="mt-5 flex animate-fade-up flex-wrap gap-x-5 gap-y-2 text-xs text-white/50"
              style={{ animationDelay: "320ms" }}
            >
              {h.notes.map((text, i) => {
                const Icon = HERO_NOTE_ICONS[i];
                return (
                  <li key={text} className="flex items-center gap-1.5">
                    <Icon size={14} className="text-rx-red" />
                    {text}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <RouteCard title={h.routeCard} />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black">
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-8 px-5 py-10 md:grid-cols-4">
          {h.stats.map(([n, l], i) => (
            <Reveal key={l} delay={i * 90} className="rx-hud rx-hud-soft relative px-5 py-4 [--l:10px] [--w:1px]">
              <p className="font-display text-4xl text-rx-red drop-shadow-[0_0_14px_rgba(225,6,0,0.45)] md:text-5xl">{n}</p>
              <p className="mt-2 text-sm text-white/55">{l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1320px] px-5 py-24">
        <Reveal>
          <Eyebrow>{h.how.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-4xl uppercase md:text-5xl">{h.how.title}</h2>
          <p className="mt-4 max-w-2xl text-white/65">{h.how.lead}</p>
        </Reveal>
        <ol className="mt-14 grid gap-px bg-white/10 md:grid-cols-3">
          {h.how.steps.map(([t, desc], i) => (
            <li key={t} className="bg-rx-black">
              <Reveal delay={i * 120} className="h-full p-7">
                <p className="font-display text-5xl text-white/10">{num(i)}</p>
                <h3 className="mt-3 font-display text-2xl uppercase">{t}</h3>
                <p className="mt-3 text-sm text-white/65">{desc}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="bg-rx-panel py-24">
        <div className="mx-auto max-w-[1320px] px-5">
          <Reveal>
            <Eyebrow>{h.features.eyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-4xl uppercase md:text-5xl">{h.features.title}</h2>
            <p className="mt-4 max-w-2xl text-white/65">{h.features.lead}</p>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {h.features.items.map(([t, desc], i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <Reveal key={t} delay={(i % 3) * 100} className="h-full">
                  <div className="rx-cut group relative h-full overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-6 transition duration-300 hover:-translate-y-1 hover:from-rx-red/[0.14] hover:to-transparent">
                    <span className="rx-hud rx-hud-soft pointer-events-none absolute inset-0 opacity-0 transition duration-300 [--l:12px] group-hover:opacity-100" />
                    <span className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-rx-red transition duration-500 group-hover:scale-x-100" />
                    <span className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rx-red/0 blur-2xl transition duration-500 group-hover:bg-rx-red/20" />
                    <div className="flex items-start justify-between">
                      <span className="relative flex h-12 w-12 items-center justify-center border border-rx-red/40 bg-rx-red/10 text-rx-red2 transition duration-300 group-hover:border-rx-red group-hover:bg-rx-red group-hover:text-white">
                        <Icon size={22} />
                      </span>
                      <span className="font-display text-sm text-white/15">{num(i)}</span>
                    </div>
                    <h3 className="mt-5 font-display text-xl uppercase">{t}</h3>
                    <p className="mt-3 text-sm text-white/65">{desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="games" className="py-24">
        <div className="mx-auto max-w-[1320px] px-5">
          <Reveal>
            <Eyebrow>{h.games.eyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-4xl uppercase md:text-5xl">{h.games.title}</h2>
            <p className="mt-4 max-w-2xl text-white/65">{h.games.lead}</p>
          </Reveal>
        </div>
        <div className="mt-12">
          <GamesMarquee />
        </div>
      </section>

      <section id="reviews" className="border-y border-white/10 bg-black py-24">
        <div className="mx-auto max-w-[1320px] px-5">
          <Reveal>
            <Eyebrow>{h.reviews.eyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-4xl uppercase md:text-5xl">{h.reviews.title}</h2>
            <p className="mt-3 text-sm text-white/40">{h.reviews.note}</p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {h.reviews.items.map(([q, n, g], i) => (
              <Reveal key={n} delay={i * 120} className="h-full">
                <figure className="relative flex h-full flex-col overflow-hidden border border-white/10 bg-rx-panel p-6 transition hover:border-white/25">
                  <QuoteIcon size={56} className="pointer-events-none absolute -right-1 -top-1 text-white/[0.04]" />
                  <div className="flex gap-1 text-rx-red" aria-label={h.reviews.rating}>
                    {[0, 1, 2, 3, 4].map((s) => (
                      <StarIcon key={s} size={16} />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-white/80">{locale === "ru" ? `«${q}»` : `“${q}”`}</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5 text-sm">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rx-red to-[#5c1010] font-display text-white ring-2 ring-rx-red/30 ring-offset-2 ring-offset-rx-panel">
                      {n[0]}
                    </span>
                    <span>
                      <span className="block font-semibold">{n}</span>
                      <span className="text-white/45">{g}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-[1320px] px-5">
          <Reveal>
            <Eyebrow>{h.pricing.eyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-4xl uppercase md:text-5xl">{h.pricing.title}</h2>
            <p className="mb-12 mt-4 max-w-2xl text-white/65">{h.pricing.lead}</p>
          </Reveal>
          <Pricing />
        </div>
      </section>

      <section id="partners" className="relative overflow-hidden bg-rx-panel py-24">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image src={arenaBg} alt="" fill quality={60} placeholder="blur" sizes="100vw" className="object-cover object-right opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-rx-black via-rx-black/80 to-rx-black/40" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-rx-black to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-rx-black to-transparent" />
        </div>
        <div className="relative mx-auto grid max-w-[1320px] gap-12 px-5 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <Eyebrow>{h.partners.eyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-4xl uppercase md:text-5xl">{h.partners.title}</h2>
            <p className="mt-4 text-white/65">{h.partners.lead}</p>
            <CtaButton href={href("/register")} className="mt-8">
              {h.partners.cta}
            </CtaButton>
          </Reveal>
          <ol className="space-y-4">
            {h.partners.steps.map(([t, desc], i) => (
              <li key={t}>
                <Reveal delay={i * 120} className="rx-cut-sm flex gap-5 bg-black/70 p-5 backdrop-blur-sm">
                  <span className="font-display text-3xl text-rx-red">{num(i)}</span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="text-sm text-white/55">{desc}</span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
        <Reveal>
          <Eyebrow>{h.faq.eyebrow}</Eyebrow>
          <h2 className="mb-10 mt-3 font-display text-4xl uppercase md:text-5xl">{h.faq.title}</h2>
        </Reveal>
        <Faq />
      </section>

      <section className="relative overflow-hidden border-t border-white/10 bg-black py-32 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image src={gamerBg} alt="" fill quality={60} placeholder="blur" sizes="100vw" className="animate-slow-zoom object-cover object-bottom opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-rx-black via-rx-black/60 to-rx-black" />
          <div className="rx-scan absolute inset-0 opacity-50" />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 animate-glow bg-[radial-gradient(ellipse,rgba(225,6,0,0.2),transparent_65%)]" />
        <Reveal className="relative px-5">
          <h2 className="font-display text-4xl uppercase md:text-6xl">
            {h.final.title1}
            <span className="block text-rx-red">{h.final.title2}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-white/60">{h.final.lead}</p>
          <CtaButton href={href("/download")} size="lg" className="mt-9">
            <WindowsIcon size={18} className="mr-2.5" />
            {d.common.downloadWindows}
          </CtaButton>
        </Reveal>
      </section>
    </div>
  );
}
