import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { authMiddleware } from "../middlewares/auth.js";
import { TeamIdParamSchema, ErrorResponseSchema } from "../schemas/common.js";
import { UserSchema, UpdateUserBodySchema, ChangePasswordBodySchema } from "../schemas/users.js";
import * as usersService from "../services/users.service.js";

type Env = { Variables: { userId: number; teamId: string } };

export const users = new OpenAPIHono<Env>();
export const usersPublic = new OpenAPIHono();

users.use("*", authMiddleware);

// GET /{teamId}/users/check-nickname
const checkNicknameRoute = createRoute({
  method: "get",
  path: "/check-nickname",
  tags: ["Users"],
  summary: "닉네임 중복 확인",
  description: "해당 팀 내에서 닉네임(name)이 이미 사용 중인지 확인합니다.",
  request: {
    params: TeamIdParamSchema,
    query: z.object({
      name: z.string().min(1).max(20).openapi({ description: "확인할 닉네임" }),
    }),
  },
  responses: {
    200: {
      description: "중복 확인 결과",
      content: {
        "application/json": {
          schema: z.object({
            available: z.boolean().openapi({ description: "사용 가능 여부 (true: 사용 가능)" }),
          }),
          example: { available: true },
        },
      },
    },
  },
});

usersPublic.openapi(checkNicknameRoute, async (c) => {
  const { teamId } = c.req.valid("param");
  const { name } = c.req.valid("query");
  const result = await usersService.checkNickname(teamId, name);
  return c.json(result, 200);
});

// GET /{teamId}/users/me
const getMeRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "내 프로필 조회",
  description: "현재 로그인한 사용자의 프로필 정보를 조회합니다.",
  request: {
    params: TeamIdParamSchema,
  },
  responses: {
    200: {
      description: "프로필 조회 성공",
      content: {
        "application/json": {
          schema: UserSchema,
          example: {
            id: 1,
            teamId: "team-abc",
            email: "user@example.com",
            name: "홍길동",
            image: "https://example.com/avatar.png",
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T09:00:00.000Z",
          },
        },
      },
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "사용자 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

users.openapi(getMeRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const result = await usersService.getMe(teamId, userId);
  return c.json(result, 200);
});

// PATCH /{teamId}/users/me
const updateMeRoute = createRoute({
  method: "patch",
  path: "/",
  tags: ["Users"],
  summary: "내 프로필 수정",
  description:
    "현재 로그인한 사용자의 프로필을 수정합니다. " +
    "name과 image 중 최소 하나의 필드를 포함해야 합니다. " +
    "image를 null로 설정하면 프로필 이미지가 제거됩니다.",
  request: {
    params: TeamIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: UpdateUserBodySchema,
          example: {
            name: "새이름",
            image: "https://example.com/new-avatar.png",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "프로필 수정 성공",
      content: {
        "application/json": {
          schema: UserSchema,
          example: {
            id: 1,
            teamId: "team-abc",
            email: "user@example.com",
            name: "새이름",
            image: "https://example.com/new-avatar.png",
            createdAt: "2026-02-16T09:00:00.000Z",
            updatedAt: "2026-02-16T10:00:00.000Z",
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
    404: {
      description: "사용자 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

users.openapi(updateMeRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const body = c.req.valid("json");
  const result = await usersService.updateMe(teamId, userId, body);
  return c.json(result, 200);
});

// PATCH /{teamId}/users/me/password
const changePasswordRoute = createRoute({
  method: "patch",
  path: "/password",
  tags: ["Users"],
  summary: "비밀번호 변경",
  description:
    "현재 비밀번호를 확인한 후 새 비밀번호로 변경합니다. " +
    "OAuth로 가입한 계정은 비밀번호 변경이 불가합니다.",
  request: {
    params: TeamIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: ChangePasswordBodySchema,
          example: {
            currentPassword: "oldpassword123",
            newPassword: "newpassword456",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "비밀번호 변경 성공",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
          example: { message: "Password changed successfully" },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음 또는 OAuth 계정",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "현재 비밀번호 불일치",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "사용자 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

users.openapi(changePasswordRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  const { currentPassword, newPassword } = c.req.valid("json");
  await usersService.changePassword(teamId, userId, currentPassword, newPassword);
  return c.json({ message: "Password changed successfully" }, 200);
});

// DELETE /{teamId}/users/me
const deleteMeRoute = createRoute({
  method: "delete",
  path: "/",
  tags: ["Users"],
  summary: "계정 삭제",
  description:
    "현재 로그인한 사용자의 계정을 삭제합니다. " +
    "관련된 모든 데이터(목표, 할 일, 노트, 게시글, 댓글 등)가 함께 삭제됩니다.",
  request: {
    params: TeamIdParamSchema,
  },
  responses: {
    204: {
      description: "계정 삭제 성공",
    },
    401: {
      description: "인증 필요",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "사용자 없음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

users.openapi(deleteMeRoute, async (c) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  await usersService.deleteMe(teamId, userId);
  return c.body(null, 204);
});
