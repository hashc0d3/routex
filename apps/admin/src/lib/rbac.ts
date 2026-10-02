/** Модель ролей админки. Без серверных импортов — используется и в клиентских компонентах. */

export const ROLES = ["super_admin", "admin", "operator"] as const;
export type Role = (typeof ROLES)[number];

/** Роли, которые super admin может выдать из интерфейса. Super admin заводится только через ADMIN_USERS. */
export const ASSIGNABLE_ROLES: Role[] = ["admin", "operator"];

export type Permission =
  /** Обзор: здоровье сервисов и счётчики */
  | "overview"
  /** Заявки и чаты с пользователями: просмотр, ответы, статусы */
  | "tickets"
  /** Клиенты сайта: список, карточка, подписка, сброс сессий */
  | "clients"
  /** Журнал событий и логи */
  | "journal"
  /** Сотрудники админки: создание, редактирование, удаление */
  | "staff";

const MATRIX: Record<Role, readonly Permission[] | "*"> = {
  super_admin: "*",
  // «Всё, кроме управления сотрудниками» — детальнее настроим позже
  admin: ["overview", "tickets", "clients", "journal"],
  operator: ["tickets"],
};

export function can(role: Role, permission: Permission) {
  const allowed = MATRIX[role];
  return allowed === "*" || allowed.includes(permission);
}

/** Куда вести после входа и при отказе в доступе. */
export function homeFor(role: Role) {
  return can(role, "overview") ? "/" : "/tickets";
}

/** Super admin редактирует и удаляет всех, кроме других super admin (и себя — только пароль в профиле). */
export function canManage(actor: { id: string; role: Role }, target: { id: string; role: Role }) {
  return can(actor.role, "staff") && target.role !== "super_admin" && actor.id !== target.id;
}

export const ROLE_INFO: Record<Role, { label: string; hint: string; tone: string }> = {
  super_admin: {
    label: "Super admin",
    hint: "Полный доступ, управление сотрудниками",
    tone: "border-rx-red/60 bg-rx-red/15 text-rx-red2",
  },
  admin: {
    label: "Admin",
    hint: "Всё, кроме управления сотрудниками",
    tone: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  },
  operator: {
    label: "Operator",
    hint: "Только заявки и чаты с пользователями",
    tone: "border-sky-400/50 bg-sky-400/10 text-sky-300",
  },
};
