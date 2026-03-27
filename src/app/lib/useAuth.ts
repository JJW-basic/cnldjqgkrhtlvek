import { useState, useEffect } from "react";
import { getToken, getTokenSync, setToken, clearToken, getExpiresInMs } from "./tokenStore";

export type AuthState = "loading" | "authenticated" | "unauthenticated";

// JWT payload를 디코딩하여 만료까지 남은 ms 반환 (서명 검증 없음 — 클라이언트 UX 전용)
function getTokenRemainingMs(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 - Date.now() : getExpiresInMs();
  } catch {
    return getExpiresInMs();
  }
}

// 만료 30초 전에 갱신 시도
const REFRESH_BEFORE_EXPIRY_MS = 30 * 1000;

/**
 * useAuth
 *
 * 인증 상태 판단의 단일 책임 훅.
 * ProtectedLayout, RootRedirect 양쪽에서 사용 — 이 훅만 수정하면 전체 반영.
 *
 * 포함 로직:
 * 1. 동기 선확인(getTokenSync) → 즉시 "authenticated" 반환
 * 2. 비동기 확인(getToken) → 새 탭 BroadcastChannel 응답 대기 (최대 500ms)
 * 3. 토큰 만료 임박 자동 갱신 → exp 기준 30초 전 /auth/token/refresh 호출
 * 4. 타 탭 로그아웃(TOKEN_CLEAR) 수신 시 즉시 "unauthenticated" 전환
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(
    getTokenSync() ? "authenticated" : "loading"
  );

  // 1·2: 초기 토큰 확인 (동기 선확인 → 비동기 BroadcastChannel 대기)
  useEffect(() => {
    if (state !== "loading") return;
    getToken().then((token) => {
      setState(token ? "authenticated" : "unauthenticated");
    });
  }, [state]);

  // 3: 토큰 만료 임박 자동 갱신
  useEffect(() => {
    if (state !== "authenticated") return;

    const token = getTokenSync();
    if (!token) return;

    const remainingMs = getTokenRemainingMs(token);
    const refreshAfterMs = Math.max(0, remainingMs - REFRESH_BEFORE_EXPIRY_MS);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/v1/auth/token/refresh", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error("refresh_failed");
        const data = await res.json();
        setToken(
          data.access_token,
          sessionStorage.getItem("auth_provider") ?? "",
          data.expires_in,
        );
        // 갱신 성공 → state를 재트리거하여 새 토큰 기준으로 타이머 재설정
        setState("loading");
        setState("authenticated");
      } catch {
        clearToken();
        setState("unauthenticated");
      }
    }, refreshAfterMs);

    return () => clearTimeout(timer);
  }, [state]);

  // 4: 타 탭 로그아웃(TOKEN_CLEAR) 수신 시 즉시 상태 전환
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("auth_token_sync");
    channel.onmessage = (e: MessageEvent) => {
      if (e.data?.type === "TOKEN_CLEAR") {
        setState("unauthenticated");
      }
    };
    return () => channel.close();
  }, []);

  return state;
}
