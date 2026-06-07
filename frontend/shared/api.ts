import Cookies from "js-cookie";

const TOKEN_KEY = "iqt_token";

export class ApiErrorResponse extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiErrorResponse";
  }
}

export function getAuthToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: "lax" });
}

export function clearAuthToken(): void {
  Cookies.remove(TOKEN_KEY);
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((entry: { msg?: string }) => entry.msg || String(entry))
        .join(", ");
    }
    return res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(path, { ...options, headers });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiErrorResponse(res.status, detail);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (error) {
    if (error instanceof ApiErrorResponse) throw error;
    throw new ApiErrorResponse(
      500,
      error instanceof Error ? error.message : "Network error"
    );
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
