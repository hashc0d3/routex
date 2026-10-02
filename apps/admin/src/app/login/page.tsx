import { LoginForm } from "./LoginForm";

export const metadata = { title: "Вход" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ended?: string }>;
}) {
  const { next, ended } = await searchParams;
  return (
    <main className="rx-grid flex min-h-[100dvh] items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="font-display text-3xl uppercase">
          Route<span className="text-rx-red">X</span> <span className="text-white/40">Admin</span>
        </p>
        <p className="mt-2 text-sm text-white/50">Панель для сайта, клиента и сервисов</p>
        {ended ? (
          <p className="mt-6 border-l-2 border-amber-400/60 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            Сессия завершена: доступ изменён или пароль сменили. Войдите снова.
          </p>
        ) : null}
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
