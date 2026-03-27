import { clearToken, getToken, setToken } from "./tokenStore";

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function refreshAccessToken(): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("/api/v1/auth/token/refresh", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("refresh_failed");
  return res.json();
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers, credentials: "include" });

  if (res.status !== 401) return res;

  // access_token 만료 → refresh 시도
  if (!isRefreshing) {
    isRefreshing = true;
    try {
      const data = await refreshAccessToken();
      setToken(data.access_token, sessionStorage.getItem("auth_provider") ?? "", data.expires_in);
      refreshQueue.forEach((cb) => cb(data.access_token));
      refreshQueue = [];
      isRefreshing = false;

      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${data.access_token}`);
      return fetch(input, { ...init, headers: retryHeaders, credentials: "include" });
    } catch {
      isRefreshing = false;
      refreshQueue = [];
      clearToken();
      window.location.replace("/");
      return res;
    }
  }

  // 이미 갱신 중이면 완료 대기 후 재시도
  return new Promise((resolve) => {
    refreshQueue.push((newToken) => {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      resolve(fetch(input, { ...init, headers: retryHeaders, credentials: "include" }));
    });
  });
}
