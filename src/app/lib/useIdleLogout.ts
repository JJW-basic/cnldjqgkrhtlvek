import { useEffect, useRef, useCallback } from "react";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "click"] as const;
const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * useIdleLogout
 *
 * 비활동 감지 시 onLogout 콜백 호출 (AuthContext.logout 위임).
 * 활동 감지 시 쿨다운 내 서버 토큰 갱신 시도.
 * tokenStore에 직접 접근하지 않음 — AuthContext가 상태 관리 담당.
 */
export function useIdleLogout(idleMs = 60 * 60 * 1000, onLogout?: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onLogoutRef.current?.();
    }, idleMs);
  }, [idleMs]);

  const handleActivity = useCallback(() => {
    resetTimer();
    const now = Date.now();
    if (now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) return;
    lastRefreshRef.current = now;

    // 활동 감지 시 서버 갱신 시도 — 성공 시 AuthContext scheduleRefresh가 처리
    fetch("/api/v1/auth/token/refresh", { method: "GET", credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<{ access_token: string; expires_in?: number }>) : null))
      .then((data) => {
        if (data?.access_token) {
          const provider = sessionStorage.getItem("auth_provider") ?? "";
          sessionStorage.setItem("access_token", data.access_token);
          sessionStorage.setItem("auth_provider", provider);
          if (data.expires_in) sessionStorage.setItem("access_token_expires_in", String(data.expires_in));
        }
      })
      .catch(() => {});
  }, [resetTimer]);

  useEffect(() => {
    resetTimer();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [resetTimer, handleActivity]);
}
