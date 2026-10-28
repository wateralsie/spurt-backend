import { z } from "zod";

const emailSchema = z
  .string()
  .email("Invalid email format")
  .transform((v) => v.trim().toLowerCase())
  .describe("이메일 주소 (소문자 변환됨)");

export const SignupBodySchema = z.object({
  email: emailSchema,
  name: z.string().min(1, "Name is required").max(20).describe("사용자 이름 (1-20자)"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters").describe("비밀번호 (8-72자)"),
});

export const LoginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").describe("비밀번호"),
});

export const RefreshBodySchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").describe("로그인 응답에서 받은 리프레시 토큰"),
});

export const OAuthBodySchema = z.object({
  token: z.string().min(1, "OAuth token is required").describe("OAuth 제공자에서 받은 인증 토큰"),
});

export const OAuthProviderParamSchema = z.object({
  provider: z.enum(["google", "kakao"]).describe("OAuth 제공자 (google 또는 kakao)"),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string().describe("API 인증에 사용할 액세스 토큰"),
  refreshToken: z.string().describe("로그인 응답에서 받은 리프레시 토큰"),
  user: z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
    image: z.string().nullable(),
  }),
});

export const TokenResponseSchema = z.object({
  accessToken: z.string().describe("API 인증에 사용할 액세스 토큰"),
  refreshToken: z
    .string()
    .nullable()
    .describe(
      "새 리프레시 토큰. 최초 갱신 후 10초 유예 시간 내 재요청 시 null을 반환합니다. " +
      "문자열일 때만 저장된 토큰을 교체하고, null이면 저장된 최신 리프레시 토큰을 유지하세요.",
    ),
});
