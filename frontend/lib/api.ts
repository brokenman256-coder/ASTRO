export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path: string, token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(token) });
  return handle(res);
}

export async function apiPost(path: string, body?: unknown, token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

export async function apiPatch(path: string, body: unknown, token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function apiPut(path: string, body: unknown, token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function apiDelete(path: string, token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return handle(res);
}

export async function apiUpload(path: string, formData: FormData, token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(token),
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
