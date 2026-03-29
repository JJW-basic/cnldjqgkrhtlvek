import { clearToken, getTokenSync } from "./tokenStore";

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function refreshAccessToken(): Promise<{ access_token: string; expires_in?: number }> {
  const res = await fetch("/api/v1/auth/token/refresh", { method: "GET", credentials: "include" });
  if (!res.ok) throw new Error("refresh_failed");
  return res.json();
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getTokenSync();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers, credentials: "include" });

  if (res.status !== 401) return res;

  if (!isRefreshing) {
    isRefreshing = true;
    try {
      const data = await refreshAccessToken();
      sessionStorage.setItem("access_token", data.access_token);
      if (data.expires_in) sessionStorage.setItem("access_token_expires_in", String(data.expires_in));
      refreshQueue.forEach((cb) => cb(data.access_token));
      refreshQueue = [];
      isRefreshing = false;

      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${data.access_token}`);
      return fetch(input, { ...init, headers: retryHeaders, credentials: "include" });
    } catch {
      isRefreshing = false;
      refreshQueue = [];
      clearToken(true);
      window.location.replace("/");
      return res;
    }
  }

  return new Promise((resolve) => {
    refreshQueue.push((newToken) => {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      resolve(fetch(input, { ...init, headers: retryHeaders, credentials: "include" }));
    });
  });
}
