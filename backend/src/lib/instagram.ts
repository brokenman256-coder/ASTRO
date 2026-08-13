import { env } from "./env";

const GRAPH = "https://graph.instagram.com/v21.0";
const AUTH = "https://www.instagram.com/oauth/authorize";
const TOKEN = "https://api.instagram.com/oauth/access_token";

// Official Instagram Login scopes. instagram_business_manage_messages is
// what unlocks the professional inbox (chats). Personal consumer DMs are
// not available through any official Instagram API.
export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

export function instagramConfigured(): boolean {
  return Boolean(env.instagramAppId && env.instagramAppSecret && env.instagramRedirectUri);
}

export function instagramAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.instagramAppId,
    redirect_uri: env.instagramRedirectUri,
    response_type: "code",
    scope: INSTAGRAM_SCOPES,
    state,
    enable_fb_login: "0",
    force_authentication: "1",
  });
  return `${AUTH}?${params.toString()}`;
}

export interface InstagramToken {
  accessToken: string;
  userId: string;
  expiresAt: Date | null;
  permissions: string[];
}

export async function exchangeInstagramCode(code: string): Promise<InstagramToken> {
  const body = new URLSearchParams({
    client_id: env.instagramAppId,
    client_secret: env.instagramAppSecret,
    grant_type: "authorization_code",
    redirect_uri: env.instagramRedirectUri,
    code,
  });
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(graphError(json, "Instagram token exchange failed"));
  }

  const short = extractAccessToken(json);
  if (!short.accessToken) throw new Error("Instagram did not return an access token");

  let accessToken = short.accessToken;
  let expiresAt: Date | null = null;
  try {
    const longLived = await exchangeLongLived(short.accessToken);
    accessToken = longLived.accessToken;
    expiresAt = longLived.expiresAt;
  } catch {
    // Short-lived token is still enough to finish login.
  }

  return {
    accessToken,
    userId: short.userId,
    expiresAt,
    permissions: short.permissions,
  };
}

async function exchangeLongLived(shortToken: string): Promise<{ accessToken: string; expiresAt: Date | null }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: env.instagramAppSecret,
    access_token: shortToken,
  });
  const res = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message || "Long-lived token exchange failed");
  }
  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null;
  return { accessToken: json.access_token, expiresAt };
}

function extractAccessToken(json: Record<string, unknown>): {
  accessToken: string;
  userId: string;
  permissions: string[];
} {
  const data = json.data;
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    const row = data[0] as Record<string, unknown>;
    return {
      accessToken: String(row.access_token ?? ""),
      userId: String(row.user_id ?? ""),
      permissions: String(row.permissions ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
  }
  return {
    accessToken: String(json.access_token ?? ""),
    userId: String(json.user_id ?? ""),
    permissions: [],
  };
}

export interface InstagramProfile {
  userId: string;
  username: string;
  name: string;
  accountType: string;
  profilePictureUrl?: string;
  followersCount?: number;
  mediaCount?: number;
}

export async function fetchInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const fields = "user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count";
  const json = await graphGet("/me", accessToken, { fields });
  return {
    userId: String(json.user_id ?? json.id ?? ""),
    username: String(json.username ?? "instagram"),
    name: String(json.name ?? json.username ?? "Instagram user"),
    accountType: String(json.account_type ?? ""),
    profilePictureUrl: json.profile_picture_url ? String(json.profile_picture_url) : undefined,
    followersCount: typeof json.followers_count === "number" ? json.followers_count : undefined,
    mediaCount: typeof json.media_count === "number" ? json.media_count : undefined,
  };
}

export async function fetchAllMedia(accessToken: string) {
  const fields = "id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,username";
  return paginate("/me/media", accessToken, { fields }, 20);
}

export async function fetchAllStories(accessToken: string) {
  const fields = "id,media_type,media_url,permalink,timestamp";
  try {
    return await paginate("/me/stories", accessToken, { fields }, 5);
  } catch {
    return [];
  }
}

export interface GraphMessage {
  conversationId: string;
  id: string;
  createdTime?: string;
  from?: string;
  text?: string;
  raw: Record<string, unknown>;
}

export async function fetchAllConversations(accessToken: string): Promise<GraphMessage[]> {
  let conversations: Record<string, unknown>[] = [];
  try {
    conversations = await paginate("/me/conversations", accessToken, { fields: "id,updated_time,participants" }, 20);
  } catch {
    return [];
  }

  const out: GraphMessage[] = [];
  for (const convo of conversations) {
    const conversationId = String(convo.id ?? "");
    if (!conversationId) continue;
    let messages: Record<string, unknown>[] = [];
    try {
      messages = await paginate(
        `/${conversationId}/messages`,
        accessToken,
        { fields: "id,created_time,from,to,message" },
        10
      );
    } catch {
      continue;
    }
    for (const msg of messages) {
      const from = msg.from;
      const fromName =
        from && typeof from === "object"
          ? String((from as { username?: string; name?: string; id?: string }).username
              ?? (from as { name?: string }).name
              ?? (from as { id?: string }).id
              ?? "")
          : "";
      const text = typeof msg.message === "string" ? msg.message : "";
      out.push({
        conversationId,
        id: String(msg.id ?? ""),
        createdTime: typeof msg.created_time === "string" ? msg.created_time : undefined,
        from: fromName,
        text,
        raw: msg,
      });
    }
  }
  return out;
}

async function paginate(
  path: string,
  accessToken: string,
  extra: Record<string, string>,
  maxPages: number
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let url: string | null = `${GRAPH}${path}?${new URLSearchParams({ ...extra, access_token: accessToken, limit: "50" })}`;
  let page = 0;
  while (url && page < maxPages) {
    const res = await fetch(url);
    const json = (await res.json()) as {
      data?: Record<string, unknown>[];
      paging?: { next?: string };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message || `Instagram GET ${path} failed`);
    if (Array.isArray(json.data)) items.push(...json.data);
    url = json.paging?.next ?? null;
    page += 1;
  }
  return items;
}

async function graphGet(path: string, accessToken: string, extra: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${GRAPH}${path}?${new URLSearchParams({ ...extra, access_token: accessToken })}`;
  const res = await fetch(url);
  const json = (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || `Instagram GET ${path} failed`);
  return json;
}

function graphError(json: Record<string, unknown>, fallback: string): string {
  const err = json.error;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  if (typeof json.error_message === "string") return json.error_message;
  return fallback;
}
