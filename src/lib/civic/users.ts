import { useSyncExternalStore } from "react";
import { ZONES, type Department, type Role, type Session } from "./types";

/**
 * User directory. Everyone who signs in is registered here, and supervisors
 * manage roles and access from Admin → Users. Swap this module for Firebase
 * Auth + a `users` collection when the backend lands.
 */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended";
  employeeId?: string | undefined;
  department?: Department | undefined;
  zone?: string | undefined;
  createdAt: number;
  lastSeen: number;
}

const KEY = "civictriage.users.v1";

function seed(): AppUser[] {
  const t = Date.now();
  const day = 86_400_000;
  return [
    {
      id: "u1",
      name: "Meera Rao",
      email: "meera@example.com",
      role: "citizen",
      status: "active",
      createdAt: t - 40 * day,
      lastSeen: t - 2 * 3600_000,
    },
    {
      id: "u2",
      name: "Arun Prasad",
      email: "arun@example.com",
      role: "citizen",
      status: "active",
      createdAt: t - 22 * day,
      lastSeen: t - 26 * 3600_000,
    },
    {
      id: "u3",
      name: "Insp. A. Khan",
      email: "a.khan@city.gov",
      role: "officer",
      status: "active",
      employeeId: "EMP-2291",
      department: "Roads",
      zone: ZONES[0],
      createdAt: t - 120 * day,
      lastSeen: t - 40 * 60_000,
    },
    {
      id: "u4",
      name: "S. Fernandes",
      email: "s.fernandes@city.gov",
      role: "officer",
      status: "active",
      employeeId: "EMP-3120",
      department: "Water",
      zone: ZONES[2],
      createdAt: t - 95 * day,
      lastSeen: t - 5 * 3600_000,
    },
    {
      id: "u5",
      name: "City Supervisor",
      email: "supervisor@city.gov",
      role: "admin",
      status: "active",
      createdAt: t - 200 * day,
      lastSeen: t - 15 * 60_000,
    },
  ];
}

let cache: AppUser[] | null = null;
const listeners = new Set<() => void>();

function persist(next: AppUser[]) {
  cache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function getUsers(): AppUser[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as AppUser[]) : seed();
  } catch {
    cache = seed();
  }
  if (!window.localStorage.getItem(KEY)) window.localStorage.setItem(KEY, JSON.stringify(cache));
  return cache;
}

export function findUser(email: string): AppUser | undefined {
  return getUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

/** Called on every sign-in / sign-up so the directory stays current. */
export function registerUser(session: Session): AppUser {
  const users = getUsers();
  const existing = findUser(session.email);
  if (existing) {
    const updated: AppUser = {
      ...existing,
      name: session.name || existing.name,
      role: session.role,
      lastSeen: Date.now(),
      ...(session.employeeId ? { employeeId: session.employeeId } : {}),
      ...(session.department ? { department: session.department } : {}),
      ...(session.zone ? { zone: session.zone } : {}),
    };
    persist(users.map((u) => (u.id === existing.id ? updated : u)));
    return updated;
  }
  const created: AppUser = {
    id: `u${Date.now().toString(36)}`,
    name: session.name,
    email: session.email,
    role: session.role,
    status: "active",
    createdAt: Date.now(),
    lastSeen: Date.now(),
    ...(session.employeeId ? { employeeId: session.employeeId } : {}),
    ...(session.department ? { department: session.department } : {}),
    ...(session.zone ? { zone: session.zone } : {}),
  };
  persist([created, ...users]);
  return created;
}

export function updateUser(id: string, partial: Partial<AppUser>) {
  persist(getUsers().map((u) => (u.id === id ? { ...u, ...partial } : u)));
}

export function removeUser(id: string) {
  persist(getUsers().filter((u) => u.id !== id));
}

export function resetUsers() {
  persist(seed());
}

export function useUsers(): AppUser[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getUsers,
    () => [],
  );
}
