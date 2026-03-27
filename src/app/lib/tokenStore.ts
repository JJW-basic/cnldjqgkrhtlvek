/**
 * tokenStore.ts
 *
 * 저장소: sessionStorage (탭/브라우저 종료 시 자동 소멸)
 * 탭 간 공유: BroadcastChannel — 새 탭이 열리면 기존 탭에 토큰을 요청하고 수신
 *
 * 메시지 프로토콜:
 *   { type: "TOKEN_REQUEST" }          → 새 탭이 기존 탭에 토큰 요청
 *   { type: "TOKEN_RESPONSE", token, provider } → 기존 탭이 응답
 *   { type: "TOKEN_CLEAR" }            → 로그아웃 시 모든 탭에 전파
 */

const CHANNEL_NAME = "auth_token_sync";
const KEY_TOKEN = "access_token";
const KEY_PROVIDER = "auth_provider";
const KEY_EXPIRES_IN = "access_token_expires_in"; // 초 단위, 서버에서 수신한 값

const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

// 다른 탭의 요청/전파 수신
if (channel) {
  channel.onmessage = (e: MessageEvent) => {
    const { type, token, provider } = e.data as {
      type: string;
      token?: string;
      provider?: string;
    };

    if (type === "TOKEN_REQUEST") {
      // 이 탭이 토큰을 보유하고 있으면 응답
      const myToken = sessionStorage.getItem(KEY_TOKEN);
      if (myToken) {
        channel.postMessage({
          type: "TOKEN_RESPONSE",
          token: myToken,
          provider: sessionStorage.getItem(KEY_PROVIDER) ?? "",
          expiresIn: sessionStorage.getItem(KEY_EXPIRES_IN) ?? "",
        });
      }
    }

    if (type === "TOKEN_RESPONSE" && token) {
      // 다른 탭으로부터 토큰 수신 → 이 탭 sessionStorage에 저장
      sessionStorage.setItem(KEY_TOKEN, token);
      if (provider) sessionStorage.setItem(KEY_PROVIDER, provider);
      if (e.data.expiresIn) sessionStorage.setItem(KEY_EXPIRES_IN, String(e.data.expiresIn));
      // 대기 중인 resolve 콜백 실행
      pendingResolvers.forEach((fn) => fn(token));
      pendingResolvers = [];
    }

    if (type === "TOKEN_CLEAR") {
      sessionStorage.removeItem(KEY_TOKEN);
      sessionStorage.removeItem(KEY_PROVIDER);
      sessionStorage.removeItem(KEY_EXPIRES_IN);
    }
  };
}

let pendingResolvers: Array<(token: string) => void> = [];

/**
 * 현재 탭의 access_token 반환.
 * 없으면 다른 탭에 요청 후 최대 500ms 대기.
 * 그래도 없으면 null 반환.
 */
export async function getToken(): Promise<string | null> {
  const local = sessionStorage.getItem(KEY_TOKEN);
  if (local) return local;

  if (!channel) return null;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingResolvers = pendingResolvers.filter((fn) => fn !== resolve);
      resolve(null);
    }, 500);

    pendingResolvers.push((token) => {
      clearTimeout(timer);
      resolve(token);
    });

    channel.postMessage({ type: "TOKEN_REQUEST" });
  });
}

export function setToken(token: string, provider: string, expiresIn?: number): void {
  sessionStorage.setItem(KEY_TOKEN, token);
  sessionStorage.setItem(KEY_PROVIDER, provider);
  if (expiresIn !== undefined) sessionStorage.setItem(KEY_EXPIRES_IN, String(expiresIn));
}

export function clearToken(): void {
  sessionStorage.removeItem(KEY_TOKEN);
  sessionStorage.removeItem(KEY_PROVIDER);
  sessionStorage.removeItem(KEY_EXPIRES_IN);
  channel?.postMessage({ type: "TOKEN_CLEAR" });
}

export function getTokenSync(): string | null {
  return sessionStorage.getItem(KEY_TOKEN);
}

/** 서버에서 수신한 access_token 유효 시간(ms). 없으면 기본값 60분 반환 */
export function getExpiresInMs(): number {
  const raw = sessionStorage.getItem(KEY_EXPIRES_IN);
  return raw ? parseInt(raw, 10) * 1000 : 60 * 60 * 1000;
}
