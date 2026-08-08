export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

// Auth is cookie-based (httpOnly session cookies set by the backend) -
// credentials: "include" makes the browser send/accept those cookies even
// though the frontend and backend live on different Netlify subdomains.
// The `token` parameter some callers still pass is legacy and unused; kept
// only so existing call sites don't all need to change their signatures.

export async function apiGet(path: string, _token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  return handle(res);
}

export async function apiPost(path: string, body?: unknown, _token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

export async function apiPatch(path: string, body: unknown, _token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function apiPut(path: string, body: unknown, _token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function apiDelete(path: string, _token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle(res);
}

export async function apiUpload(path: string, formData: FormData, _token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handle(res);
}

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }
  return data;
}

export const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
