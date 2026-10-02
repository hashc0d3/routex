import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/staff";

/** Любой неизвестный адрес — 404 внутри панели (с меню), а не голая страница без навигации. */
export default async function Missing() {
  await requireStaff();
  notFound();
}
