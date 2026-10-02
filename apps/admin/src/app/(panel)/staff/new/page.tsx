import { requireStaff } from "@/lib/staff";
import { BackLink, PageTitle } from "../../ui";
import { CreateForm } from "./CreateForm";

export const metadata = { title: "Новый сотрудник" };

export default async function NewUserPage() {
  await requireStaff("staff");
  return (
    <div className="max-w-2xl">
      <BackLink href="/staff">Администраторы</BackLink>
      <div className="mt-3">
        <PageTitle sub="Роль обязательна — от неё зависит, какие разделы увидит сотрудник">Новый сотрудник</PageTitle>
      </div>
      <CreateForm />
    </div>
  );
}
