import { ROLE_INFO } from "@/lib/rbac";
import { requireStaff } from "@/lib/staff";
import { PageTitle, RoleBadge } from "../ui";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Профиль" };

export default async function ProfilePage() {
  const me = await requireStaff();
  return (
    <div className="max-w-2xl">
      <PageTitle sub={me.email}>{me.name}</PageTitle>
      <section className="mb-4 flex items-center gap-3 border border-white/10 bg-rx-panel p-6">
        <RoleBadge role={me.role} />
        <p className="text-sm text-white/55">{ROLE_INFO[me.role].hint}</p>
      </section>
      <PasswordForm />
    </div>
  );
}
