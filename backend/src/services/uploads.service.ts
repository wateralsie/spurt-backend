import { randomUUID } from "crypto";
import { ApiError } from "../lib/api-error.js";
import { generatePresignedUploadUrl } from "../lib/s3.js";

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
]);

const EXTENSION_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set in environment variables`);
  return value;
}

const keyPrefix = requiredEnv("S3_KEY_PREFIX");

function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export async function getImageUploadUrl(
  teamId: string,
  userId: number,
  fileName: string,
): Promise<{ uploadUrl: string; url: string }> {
  const ext = getExtension(fileName);

  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new ApiError(
      400,
      "허용되지 않는 이미지 확장자입니다. (jpg, jpeg, png, gif, webp, svg)",
      "INVALID_IMAGE_EXTENSION",
    );
  }

  const contentType = EXTENSION_CONTENT_TYPE[ext] ?? "application/octet-stream";
  const key = `${keyPrefix}/${teamId}/${userId}/images/${randomUUID()}.${ext}`;

  return generatePresignedUploadUrl(key, contentType);
}

export async function getFileUploadUrl(
  teamId: string,
  userId: number,
  fileName: string,
): Promise<{ uploadUrl: string; url: string }> {
  const ext = getExtension(fileName);
  const key = ext
    ? `${keyPrefix}/${teamId}/${userId}/files/${randomUUID()}.${ext}`
    : `${keyPrefix}/${teamId}/${userId}/files/${randomUUID()}`;

  return generatePresignedUploadUrl(key, "application/octet-stream");
}
