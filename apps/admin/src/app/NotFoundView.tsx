import Link from "next/link";
import { BackButton } from "./BackButton";

export function NotFoundView({ home, homeLabel }: { home: string; homeLabel: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <p className="font-display text-[120px] leading-none text-rx-red [text-shadow:0_0_40px_rgba(225,6,0,0.35)]">404</p>
        <h1 className="mt-2 font-display text-2xl uppercase">Страница не найдена</h1>
        <p className="mt-3 text-sm text-white/55">
          Такого адреса нет или запись удалили. Проверь ссылку — или вернись туда, откуда пришёл.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={home} className="btn btn-primary">
            {homeLabel}
          </Link>
          <BackButton />
        </div>
      </div>
    </div>
  );
}
