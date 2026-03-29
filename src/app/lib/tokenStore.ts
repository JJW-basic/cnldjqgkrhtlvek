/**
 * tokenStore.ts — 순수 스토리지 I/O 레이어
 *
 * 설계 원칙:
 *   - 이 모듈은 sessionStorage 읽기/쓰기만 담당한다.
 *   - 페이지 이동(navigate)은 절대 수행하지 않는다.
 *   - 탭 간 동기화 신호만 localStorage에 기록한다.
 *   - 모든 상태 전환과 네비게이션은 AuthContext가 결정한다.
 */

const KEY_TOKEN = "access_token";
const KEY_PROVIDER = "auth_provider";
const KEY_EXPIRES_IN = "access_token_expires_in";

export const STORAGE_LOGIN_KEY = "auth_login_signal";
export const STORAGE_LOGOUT_KEY = "auth_logout_signal";

export function setToken(token: string, provider: string, expiresIn?: number): void {
  sessionStorage.setItem(KEY_TOKEN, token);
  sessionStorage.setItem(KEY_PROVIDER, provider);
  if (expiresIn !== undefined) sessionStorage.setItem(KEY_EXPIRES_IN, String(expiresIn));

  // 다른 탭에 로그인 신호 전파 (set→remove 즉시 실행으로 storage 이벤트 트리거)
  localStorage.setItem(STORAGE_LOGIN_KEY, Date.now().toString());
  localStorage.removeItem(STORAGE_LOGIN_KEY);
}

export function clearToken(broadcastLogout = false): void {
  sessionStorage.removeItem(KEY_TOKEN);
  sessionStorage.removeItem(KEY_PROVIDER);
  sessionStorage.removeItem(KEY_EXPIRES_IN);

  if (broadcastLogout) {
    localStorage.setItem(STORAGE_LOGOUT_KEY, Date.now().toString());
    localStorage.removeItem(STORAGE_LOGOUT_KEY);
  }
}

export function getTokenSync(): string | null {
  return sessionStorage.getItem(KEY_TOKEN);
}

export function getExpiresInMs(): number {
  const raw = sessionStorage.getItem(KEY_EXPIRES_IN);
  return raw ? parseInt(raw, 10) * 1000 : 60 * 60 * 1000;
}
