import { homeFor } from "@/lib/rbac";
import { currentStaff } from "@/lib/staff";
import { NotFoundView } from "../NotFoundView";

export const metadata = { title: "Страница не найдена" };

export default async function PanelNotFound() {
  const staff = await currentStaff();
  const home = staff ? homeFor(staff.role) : "/";
  return <NotFoundView home={home} homeLabel={home === "/" ? "На обзор" : "К заявкам"} />;
}
