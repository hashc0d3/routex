import { NotFoundView } from "./NotFoundView";

export const metadata = { title: "Страница не найдена" };

export default function RootNotFound() {
  return (
    <main className="min-h-[100dvh] px-6">
      <NotFoundView home="/" homeLabel="В админку" />
    </main>
  );
}
