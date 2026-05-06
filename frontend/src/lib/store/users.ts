import { getFirestore } from "@/lib/firebaseAdmin";
import { hashPassword, verifyPassword } from "@/lib/password";

export type UserRole = "CUSTOMER" | "VIEWER" | "MANAGER" | "ADMIN";

export type AppUser = {
  id: string;
  email: string;
  passwordHash?: string | null;
  name?: string | null;
  role: UserRole;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyApp: boolean;
  createdAt?: number;
  updatedAt?: number;
};

function roleForEmail(email: string): UserRole {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const managerEmails = (process.env.MANAGER_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const viewerEmails = (process.env.VIEWER_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const e = email.toLowerCase();
  if (adminEmails.includes(e)) return "ADMIN";
  if (managerEmails.includes(e)) return "MANAGER";
  if (viewerEmails.includes(e)) return "VIEWER";
  return "CUSTOMER";
}

function userRef(emailLower: string) {
  return getFirestore().collection("users").doc(emailLower);
}

export async function ensureDefaultAdminUser() {
  const enabled = (process.env.DEFAULT_ADMIN_ENABLED || "").toLowerCase() === "true";
  if (!enabled) return;
  if (process.env.NODE_ENV === "production") return;

  const username = "admin";
  const ref = userRef(username);
  const snap = await ref.get();
  if (snap.exists) return;

  const now = Date.now();
  const user: AppUser = {
    id: username,
    email: username,
    name: "Admin",
    passwordHash: await hashPassword("admin@123"),
    role: "ADMIN",
    notifyEmail: false,
    notifySms: false,
    notifyApp: true,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(user);
}

export async function getUserByEmail(email: string) {
  const emailLower = email.toLowerCase().trim();
  const snap = await userRef(emailLower).get();
  if (!snap.exists) return null;
  return snap.data() as AppUser;
}

export async function ensureGoogleUser(params: { email: string; name?: string | null }) {
  const emailLower = params.email.toLowerCase().trim();
  const ref = userRef(emailLower);
  const snap = await ref.get();
  const desiredRole = roleForEmail(emailLower);

  if (!snap.exists) {
    const now = Date.now();
    const user: AppUser = {
      id: emailLower,
      email: emailLower,
      name: params.name || null,
      passwordHash: null,
      role: desiredRole,
      notifyEmail: true,
      notifySms: false,
      notifyApp: true,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(user);
    return user;
  }

  const existing = snap.data() as AppUser;
  if (existing.role !== desiredRole) {
    await ref.update({ role: desiredRole, updatedAt: Date.now() });
    return { ...existing, role: desiredRole };
  }

  return existing;
}

export async function registerUser(params: { email: string; password: string; name?: string | null }) {
  const emailLower = params.email.toLowerCase().trim();
  const ref = userRef(emailLower);
  const snap = await ref.get();
  if (snap.exists) {
    return { ok: false as const, error: "Email already registered" };
  }

  const now = Date.now();
  const user: AppUser = {
    id: emailLower,
    email: emailLower,
    name: params.name || null,
    passwordHash: await hashPassword(params.password),
    role: "CUSTOMER",
    notifyEmail: true,
    notifySms: false,
    notifyApp: true,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(user);
  return { ok: true as const, user };
}

export async function verifyCredentials(params: { email: string; password: string }) {
  const user = await getUserByEmail(params.email);
  if (!user || !user.passwordHash) return null;
  const ok = await verifyPassword(params.password, user.passwordHash);
  if (!ok) return null;
  return user;
}
