"use client";

// The real session lives in an httpOnly cookie set by the backend - client
// JS can never read it (that's the point: it can't be stolen via XSS).
// Everything stored here is just a lightweight "am I probably logged in"
// flag plus non-sensitive display info, so pages can render instantly
// instead of waiting on a network round trip. It is NOT the source of
// truth - if the cookie has expired, the next API call still 401s and
// callers should handle that (most already redirect to /login on failure).

const USER_FLAG_KEY = "astro_user_logged_in";
const USER_INFO_KEY = "astro_user_info";
const ADMIN_FLAG_KEY = "astro_admin_logged_in";
const ADMIN_INFO_KEY = "astro_admin_info";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  dob?: string | null;
}

export interface AdminInfo {
  id: string;
  username: string;
}

// Returns a truthy sentinel (not a real token) when a session cookie was
// set at last login/signup - existing call sites that do
// `apiGet(path, getUserToken())` keep working unchanged; the value itself
// is ignored now that requests authenticate via the cookie.
export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_FLAG_KEY) ? "cookie-session" : null;
}

export function setUserSession(info: UserInfo) {
  localStorage.setItem(USER_FLAG_KEY, "1");
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
}

export function getUserInfo(): UserInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_INFO_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearUserSession() {
  localStorage.removeItem(USER_FLAG_KEY);
  localStorage.removeItem(USER_INFO_KEY);
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_FLAG_KEY) ? "cookie-session" : null;
}

export function setAdminToken(admin?: AdminInfo) {
  localStorage.setItem(ADMIN_FLAG_KEY, "1");
  if (admin) localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin));
}

export function getAdminInfo(): AdminInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ADMIN_INFO_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_FLAG_KEY);
  localStorage.removeItem(ADMIN_INFO_KEY);
}
