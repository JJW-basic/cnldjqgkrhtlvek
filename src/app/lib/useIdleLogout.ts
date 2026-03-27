import { useEffect, useRef, useCallback } from "react";
import { clearToken, setToken } from "./tokenStore";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "click"] as const;
// 활동 감지 시 토큰 갱신 쿨다운 (5분)
const REFRESH_COOLDOWN = 5 * 60 * 1000;

/**
 * useIdleLogout
 *
 * - idleMs: 비활동 허용 시간 (기본 60분 = access_token 만료 시간과 동일)
 * - 활동 감지 시 타이머 리셋 + 쿨다운 내 서버 토큰 갱신 (활동 중 만료 방지)
 * - 비활동 idleMs 경과 시 로그아웃 처리 후 onIdle 콜백 호출
 */
export function useIdleLogout(onIdle: () => void, idleMs = 60 * 60 * 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      clearToken();
      try {
        await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
      } catch { /* ignore */ }
      onIdleRef.current();
    }, idleMs);
  }, [idleMs]);

  const handleActivity = useCallback(() => {
    resetTimer();
    const now = Date.now();
    if (now - lastRefreshRef.current < REFRESH_COOLDOWN) return;
    lastRefreshRef.current = now;

    // 활동 중 백그라운드 토큰 갱신
    fetch("/api/v1/auth/token/refresh", { method: "GET", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.access_token) {
          setToken(data.access_token, sessionStorage.getItem("auth_provider") ?? "", data.expires_in);
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
