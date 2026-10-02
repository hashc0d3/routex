import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManage } from "@/lib/rbac";
import { requireStaff, UUID_RE } from "@/lib/staff";
import { fmtDate } from "@/lib/support";
import { BackLink, PageTitle, RoleBadge } from "../../ui";
import { DeleteForm, EditForm, ResetPasswordForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff("staff");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const user = await db.staffUser.findUnique({ where: { id } });
  if (!user) notFound();
  if (user.id === me.id) redirect("/profile");
  if (!canManage(me, user)) redirect("/staff");

  return (
    <div className="max-w-2xl">
      <BackLink href="/staff">Администраторы</BackLink>
      <div className="mt-3 flex items-start justify-between gap-4">
        <PageTitle
          sub={
            <>
              Создан {fmtDate(user.createdAt.toISOString())} · последний вход{" "}
              {user.lastLoginAt ? fmtDate(user.lastLoginAt.toISOString()) : "—"}
            </>
          }
        >
          {user.name}
        </PageTitle>
        <RoleBadge role={user.role} />
      </div>

      <section className="space-y-4">
        <EditForm user={{ id: user.id, email: user.email, name: user.name, role: user.role, active: user.active }} />
        <ResetPasswordForm id={user.id} />
        <DeleteForm id={user.id} email={user.email} />
      </section>
    </div>
  );
}
