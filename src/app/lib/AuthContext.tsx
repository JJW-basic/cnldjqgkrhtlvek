import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  clearToken,
  getTokenSync,
  setToken,
  getExpiresInMs,
  STORAGE_LOGIN_KEY,
  STORAGE_LOGOUT_KEY,
} from "./tokenStore";

export type AuthState = "loading" | "authenticated" | "unauthenticated";

// JWT exp 클레임 기준 만료 판단 (클라이언트 UX 전용, 보안 검증은 서버 수행)
// Clock skew 버퍼 30초: 미세한 시간 차로 인한 루프 방지
const CLOCK_SKEW_SEC = 30;
const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000; // 만료 1분 전 갱신 시도

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp < Date.now() / 1000 - CLOCK_SKEW_SEC;
  } catch {
    return true;
  }
}

function getTokenRemainingMs(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    return payload.exp ? payload.exp * 1000 - Date.now() : getExpiresInMs();
  } catch {
    return getExpiresInMs();
  }
}

interface AuthContextValue {
  authState: AuthState;
  login: (token: string, provider: string, expiresIn?: number) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // 초기 상태: 동기적으로 토큰 유효성 확인 → loading 단계 없이 즉시 결정
  const [authState, setAuthState] = useState<AuthState>(() => {
    const token = getTokenSync();
    if (!token) return "unauthenticated";
    if (isTokenExpired(token)) {
      clearToken(); // 만료 토큰 즉시 정리 (broadcastLogout=false: 현재 탭만)
      return "unauthenticated";
    }
    return "authenticated";
  });

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // logout을 ref로 관리하여 scheduleRefresh 내 stale closure 방지
  const logoutRef = useRef<() => Promise<void>>(async () => {});

  const login = useCallback((token: string, provider: string, expiresIn?: number) => {
    setToken(token, provider, expiresIn);
    setAuthState("authenticated");
  }, []);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    clearToken(true); // 다른 탭에 로그아웃 신호 전파
    setAuthState("unauthenticated");
    // 서버 refresh_token 쿠키 삭제 (실패해도 클라이언트 상태는 이미 정리됨)
    try {
      await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    // 네비게이션: ProtectedLayout이 authState="unauthenticated"를 감지하여 /로 이동
  }, []);

  // logoutRef 항상 최신 logout 참조 유지
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // 토큰 갱신 스케줄링 — logout을 ref로 참조하여 stale closure 완전 차단
  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const remainingMs = getTokenRemainingMs(token);
    const delay = Math.max(0, remainingMs - REFRESH_BEFORE_EXPIRY_MS);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/v1/auth/token/refresh", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error("refresh_failed");
        const data = (await res.json()) as {
          access_token: string;
          expires_in?: number;
        };
        const provider = sessionStorage.getItem("auth_provider") ?? "";
        setToken(data.access_token, provider, data.expires_in);
        setAuthState("authenticated");
        scheduleRefresh(data.access_token);
      } catch {
        await logoutRef.current();
      }
    }, delay);
  }, []); // scheduleRefresh 자체는 순수 함수 — 의존성 없음

  // 인증 상태 변경 시 갱신 타이머 관리
  useEffect(() => {
    if (authState !== "authenticated") {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      return;
    }
    const token = getTokenSync();
    if (token) scheduleRefresh(token);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [authState, scheduleRefresh]);

  // 탭 간 동기화: storage 이벤트 단일 등록 (AuthContext가 유일한 등록 위치)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_LOGIN_KEY && e.newValue) {
        // 다른 탭 로그인 완료 → 현재 탭 sessionStorage 갱신 후 상태 전환
        // setToken()이 이미 sessionStorage에 저장했으므로 상태만 전환
        // (단, 다른 탭의 sessionStorage는 공유되지 않으므로 직접 이동)
        window.location.replace("/services");
      }
      if (e.key === STORAGE_LOGOUT_KEY && e.newValue) {
        clearToken();
        setAuthState("unauthenticated");
        window.location.replace("/");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
