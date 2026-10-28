import { z } from "zod";

export const ImageUploadBodySchema = z.object({
  fileName: z.string().trim().min(1).max(200).describe("업로드할 파일 이름 (확장자 포함, 1-200자)"),
});

export const FileUploadBodySchema = z.object({
  fileName: z.string().trim().min(1).max(200).describe("업로드할 파일 이름 (확장자 포함, 1-200자)"),
});

export const PresignedUrlResponseSchema = z.object({
  uploadUrl: z.string().describe("이 URL로 PUT 요청하여 파일을 업로드하세요"),
  url: z.string().describe("업로드 완료 후 다른 API에서 사용할 파일 URL"),
});
