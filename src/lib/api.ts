export type ApiError = {
  error?: string;
  status?: number;
  requires_email_verification?: boolean;
};

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requiresEmailVerification = false,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type TokenResponse = {
  tokens?: { access_token?: string; refresh_token?: string };
};

let accessToken = "";
let refreshToken = "";
let refreshInFlight: Promise<boolean> | null = null;

function apiUrl(path: string) {
  const normalized = path.replace(/^\/+/, "").replace(/^api\//, "");
  const apiPath = `/api/v1/${normalized}`;
  if (import.meta.env.DEV) return apiPath;

  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
  if (!apiBase) {
    throw new Error("VITE_API_URL must be set in the frontend environment.");
  }
  return `${apiBase}${apiPath}`;
}

function applyTokens(payload: TokenResponse) {
  const bundle = payload.tokens;
  if (!bundle?.access_token || !bundle.refresh_token) return;
  accessToken = bundle.access_token;
  refreshToken = bundle.refresh_token;
  delete payload.tokens;
}

function clearTokens() {
  accessToken = "";
  refreshToken = "";
}

async function refreshSession() {
  if (!refreshToken) return false;

  const response = await fetch(apiUrl("auth/refresh"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    clearTokens();
    return false;
  }

  const payload = (await response.json()) as TokenResponse;
  applyTokens(payload);
  return Boolean(accessToken);
}

async function tryRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiRequest(path: string, init: RequestInit = {}) {
  const send = () => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (
      init.body !== undefined &&
      !(init.body instanceof FormData) &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    return fetch(apiUrl(path), {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers,
    });
  };

  let response = await send();
  const normalizedPath = path.replace(/^\/+/, "").replace(/^api\//, "");
  const isAuthEndpoint = /^auth\/(?:login|register|verify-email|resend-verification|forgot-password|verify-password-reset-code|reset-password|google|refresh|logout)$/.test(normalizedPath);
  if (response.status === 401 && refreshToken && !isAuthEndpoint && (await tryRefresh())) {
    response = await send();
  }
  return response;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await apiRequest(path, init);
  const normalizedPath = path.replace(/^\/+/, "").replace(/^api\//, "");
  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();
  let payload: (T & ApiError & TokenResponse) | null = null;
  if (responseText.trim() && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(responseText) as T & ApiError & TokenResponse;
    } catch {
      payload = null;
    }
  }

  const responseMessage = responseText
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  const statusMessage = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

  if (!response.ok) {
    if (normalizedPath === "auth/logout") clearTokens();
    throw new ApiRequestError(
      payload?.error ?? (responseMessage || statusMessage),
      response.status,
      Boolean(payload?.requires_email_verification),
    );
  }

  if (payload === null) {
    throw new ApiRequestError(responseMessage || statusMessage, response.status);
  }

  if (payload && typeof payload === "object") {
    applyTokens(payload);
    if (normalizedPath === "auth/logout") clearTokens();
  }

  return payload as T;
}

export async function request<T = any>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  const requestPath = query
    ? `${path}${path.includes("?") ? "&" : "?"}${query}`
    : path;
  return apiFetch<T>(requestPath, {
    method: options.method,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}
