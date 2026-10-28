import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "../middlewares/auth.js";
import { TeamIdParamSchema, ErrorResponseSchema } from "../schemas/common.js";
import {
  ImageUploadBodySchema,
  FileUploadBodySchema,
  PresignedUrlResponseSchema,
} from "../schemas/uploads.js";
import * as uploadsService from "../services/uploads.service.js";

type Env = { Variables: { userId: number; teamId: string } };

// Images
export const images = new OpenAPIHono<Env>();
images.use("*", authMiddleware);

const imageUploadRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Uploads"],
  summary: "이미지 업로드 presigned URL 발급",
  description:
    "이미지 업로드용 presigned URL을 발급합니다. " +
    "허용 확장자: jpg, jpeg, png, gif, webp, svg. " +
    "반환된 uploadUrl에 PUT 요청으로 파일을 업로드하고, url을 프로필 이미지 등에 사용합니다.",
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: ImageUploadBodySchema,
          example: {
            fileName: "profile.png",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "presigned URL 발급 성공",
      content: {
        "application/json": {
          schema: PresignedUrlResponseSchema,
          example: {
            uploadUrl:
              "https://s3.ap-northeast-2.amazonaws.com/bucket/...?X-Amz-Signature=...",
            url: "https://cdn.example.com/team-abc/1/images/550e8400.png",
          },
        },
      },
    },
    400: {
      description: "잘못된 확장자",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

images.openapi(imageUploadRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { fileName } = c.req.valid("json");
  const result = await uploadsService.getImageUploadUrl(
    teamId,
    userId,
    fileName,
  );
  return c.json(result, 200);
});

// Files
export const files = new OpenAPIHono<Env>();
files.use("*", authMiddleware);

const fileUploadRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Uploads"],
  summary: "파일 업로드 presigned URL 발급",
  description:
    "일반 파일 업로드용 presigned URL을 발급합니다. 확장자 제한 없음. " +
    "사용법은 이미지 업로드와 동일합니다.",
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: FileUploadBodySchema,
          example: {
            fileName: "report.pdf",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "presigned URL 발급 성공",
      content: {
        "application/json": {
          schema: PresignedUrlResponseSchema,
          example: {
            uploadUrl:
              "https://s3.ap-northeast-2.amazonaws.com/bucket/...?X-Amz-Signature=...",
            url: "https://cdn.example.com/team-abc/1/files/550e8400.pdf",
          },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

files.openapi(fileUploadRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { fileName } = c.req.valid("json");
  const result = await uploadsService.getFileUploadUrl(
    teamId,
    userId,
    fileName,
  );
  return c.json(result, 200);
});
