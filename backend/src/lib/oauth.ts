import { ApiError } from "./api-error.js";

interface OAuthUserInfo {
  email: string;
  name: string;
  image?: string;
  providerId: string;
}

export async function getGoogleUserInfo(
  accessToken: string,
): Promise<OAuthUserInfo> {
  const res = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new ApiError(401, "Failed to get Google user info", "OAUTH_FAILED");

  const data = await res.json();

  if (!data.email) {
    throw new ApiError(401, "Email permission is required for Google login", "OAUTH_FAILED");
  }

  return {
    email: data.email.trim().toLowerCase(),
    name: data.name,
    image: data.picture,
    providerId: data.id,
  };
}

export async function getKakaoUserInfo(
  accessToken: string,
): Promise<OAuthUserInfo> {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new ApiError(401, "Failed to get Kakao user info", "OAUTH_FAILED");

  const data = await res.json();
  const account = data.kakao_account;
  const email = account?.email
    ? account.email.trim().toLowerCase()
    : `kakao_${data.id}@kakao-oauth.local`;

  return {
    email,
    name: account?.profile?.nickname ?? data.properties?.nickname ?? "카카오 사용자",
    image: account?.profile?.profile_image_url,
    providerId: String(data.id),
  };
}

export function getOAuthUserInfo(
  provider: "google" | "kakao",
  accessToken: string,
): Promise<OAuthUserInfo> {
  if (provider === "google") return getGoogleUserInfo(accessToken);
  return getKakaoUserInfo(accessToken);
}
