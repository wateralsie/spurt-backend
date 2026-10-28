import { api } from "./api";
import { setTokens } from "./auth";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!;

// --- Google ---

export function initGoogle(): Promise<google.accounts.oauth2.TokenClient> {
  return new Promise((resolve) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "email profile",
      callback: () => {},
    });
    resolve(client);
  });
}

export function requestGoogleToken(
  client: google.accounts.oauth2.TokenClient,
): Promise<string> {
  return new Promise((resolve, reject) => {
    client.callback = (res) => {
      if (res.error) return reject(new Error(res.error));
      resolve(res.access_token);
    };
    client.requestAccessToken();
  });
}

// --- Kakao ---

export function getKakaoAuthUrl(): string {
  const redirectUri = `${window.location.origin}/oauth/kakao/callback`;
  return `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
}

export async function exchangeKakaoCode(code: string): Promise<string> {
  const redirectUri = `${window.location.origin}/oauth/kakao/callback`;

  const res = await fetch("/api/oauth/kakao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri }),
  });

  if (!res.ok) throw new Error("카카오 토큰 교환에 실패했습니다.");
  const data = await res.json();
  return data.access_token;
}

// --- Shared ---

export async function oauthLogin(
  provider: "google" | "kakao",
  token: string,
): Promise<void> {
  const data = await api<AuthResponse>(`/oauth/${provider}`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  setTokens(data.accessToken, data.refreshToken);
}
