"use client";

const USER_TOKEN_KEY = "astro_user_token";
const USER_INFO_KEY = "astro_user_info";
const ADMIN_TOKEN_KEY = "astro_admin_token";

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function setUserSession(token: string, info: { id: string; name: string; email: string }) {
  localStorage.setItem(USER_TOKEN_KEY, token);
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
}

export function getUserInfo(): { id: string; name: string; email: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_INFO_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearUserSession() {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}
