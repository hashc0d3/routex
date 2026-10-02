import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/** Сессия есть, но сотрудник заблокирован/удалён/сменил пароль — чистим cookie и ведём на вход. */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?ended=1", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
