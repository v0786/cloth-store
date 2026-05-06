import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export type AppRole = "ADMIN" | "MANAGER" | "VIEWER" | "CUSTOMER";

const roleRank: Record<AppRole, number> = {
  CUSTOMER: 0,
  VIEWER: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export function isRoleAtLeast(role: AppRole | undefined, minRole: AppRole) {
  if (!role) return false;
  return roleRank[role] >= roleRank[minRole];
}

export async function requireRole(minRole: AppRole) {
  const session = await getSession();
  const role = (session?.user as any)?.role as AppRole | undefined;
  if (!session?.user || !isRoleAtLeast(role, minRole)) {
    return null;
  }
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  const role = (session?.user as any)?.role as AppRole | undefined;
  if (!session?.user || role !== "ADMIN") return null;
  return session;
}
