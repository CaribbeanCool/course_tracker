"use client";

export type AuthUser = {
  id: number;
  username: string;
};

const STORAGE_KEY = "course_tracker_user";

export function backendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3010";
}

export function apiUrl(pathname: string): string {
  const base = backendBaseUrl();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(path, base).toString();
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed || typeof parsed.id !== "number" || !parsed.username)
      return null;
    return { id: parsed.id, username: String(parsed.username) };
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function signInWithCredentials(
  username: string,
  password: string,
): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Invalid credentials");
  }

  const user = (await res.json()) as AuthUser;
  if (!user?.id || !user?.username) throw new Error("Invalid auth response");

  setStoredUser(user);
  return user;
}

export async function apiFetch(pathname: string, init?: RequestInit) {
  const user = getStoredUser();
  const headers = new Headers(init?.headers);
  if (user) headers.set("X-User-Id", String(user.id));

  return fetch(apiUrl(pathname), {
    ...init,
    headers,
  });
}

export async function apiFetchJson<T>(
  pathname: string,
  init?: RequestInit,
): Promise<T> {
  const res = await apiFetch(pathname, init);
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
