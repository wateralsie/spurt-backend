import { mock } from "bun:test";

// Bun auto-loads .env — no separate test env needed.
// All test data is isolated by teamId (prefix "test-").

// ── Mock S3 (presigned URL) ──
mock.module("../lib/s3.js", () => ({
  generatePresignedUploadUrl: async (key: string, _contentType: string) => ({
    uploadUrl: `https://test-bucket.s3.us-east-1.amazonaws.com/${key}?presigned`,
    url: `https://test-bucket.s3.us-east-1.amazonaws.com/${key}`,
  }),
}));

// ── Mock OAuth ──
(globalThis as any).__mockOAuthUserInfo = null;

mock.module("../lib/oauth.js", () => {
  const getInfo = async () => {
    const info = (globalThis as any).__mockOAuthUserInfo;
    if (!info) {
      const { ApiError } = await import("../lib/api-error.js");
      throw new ApiError(401, "OAuth failed", "OAUTH_FAILED");
    }
    return info;
  };
  return {
    getOAuthUserInfo: getInfo,
    getGoogleUserInfo: getInfo,
    getKakaoUserInfo: getInfo,
  };
});
