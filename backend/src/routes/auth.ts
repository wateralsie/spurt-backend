import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ErrorResponseSchema, TeamIdParamSchema } from "../schemas/common.js";
import {
  SignupBodySchema,
  LoginBodySchema,
  RefreshBodySchema,
  OAuthBodySchema,
  OAuthProviderParamSchema,
  AuthResponseSchema,
  TokenResponseSchema,
} from "../schemas/auth.js";
import * as authService from "../services/auth.service.js";

export const auth = new OpenAPIHono();
export const oauth = new OpenAPIHono();

// POST /{teamId}/auth/signup
const signupRoute = createRoute({
  method: "post",
  path: "/signup",
  tags: ["Auth"],
  summary: "회원가입",
  description:
    "이메일, 이름, 비밀번호로 새 계정을 생성합니다. " +
    "이메일은 팀 내에서 고유해야 하며, 비밀번호는 8자 이상이어야 합니다. " +
    "성공 시 accessToken, refreshToken, user 정보를 함께 반환합니다.",
  security: [],
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: SignupBodySchema,
          example: {
            email: "user@example.com",
            name: "홍길동",
            password: "password123",
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: "회원가입 성공",
      content: {
        "application/json": {
          schema: AuthResponseSchema,
          example: {
            accessToken: "eyJhbGciOiJIUzI1NiIs...",
            refreshToken: "eyJhbGciOiJIUzI1NiIs...",
            user: {
              id: 1,
              email: "user@example.com",
              name: "홍길동",
              image: null,
            },
          },
        },
      },
    },
    400: {
      description: "유효성 검사 실패",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "이메일 중복",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

auth.openapi(signupRoute, async (c) => {
  const { teamId } = c.req.valid("param");
  const { email, name, password } = c.req.valid("json");
  const result = await authService.signup(teamId, email, name, password);
  return c.json(result, 201);
});

// POST /{teamId}/auth/login
const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "로그인",
  description:
    "이메일과 비밀번호로 로그인합니다. " +
    "OAuth로 가입한 계정은 이메일/비밀번호 로그인이 불가합니다.",
  security: [],
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: LoginBodySchema,
          example: {
            email: "user@example.com",
            password: "password123",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "로그인 성공",
      content: {
        "application/json": {
          schema: AuthResponseSchema,
          example: {
            accessToken: "eyJhbGciOiJIUzI1NiIs...",
            refreshToken: "eyJhbGciOiJIUzI1NiIs...",
            user: {
              id: 1,
              email: "user@example.com",
              name: "홍길동",
              image: null,
            },
          },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "인증 실패",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

auth.openapi(loginRoute, async (c) => {
  const { teamId } = c.req.valid("param");
  const { email, password } = c.req.valid("json");
  const result = await authService.login(teamId, email, password);
  return c.json(result, 200);
});

// POST /{teamId}/auth/refresh
const refreshRoute = createRoute({
  method: "post",
  path: "/refresh",
  tags: ["Auth"],
  summary: "토큰 재발급",
  description:
    "refreshToken으로 새 accessToken과 refreshToken을 발급받습니다 (토큰 로테이션). " +
    "기존 refreshToken에는 최초 갱신 시점부터 10초의 유예 시간(grace period)이 적용됩니다.\n\n" +
    "동일한 refreshToken으로 동시에 요청하면 순차적으로 처리됩니다. " +
    "최초 갱신은 새 토큰 쌍을 반환하고, 유예 시간 내 재요청은 HTTP 200과 함께 " +
    "accessToken만 발급하며 refreshToken은 null을 반환합니다. 재요청으로 유예 시간이 연장되지는 않습니다.\n\n" +
    "클라이언트는 응답의 refreshToken이 문자열일 때만 저장된 값을 교체해야 합니다. " +
    "null이면 저장된 최신 refreshToken을 유지하고, null이나 재요청에 사용한 이전 토큰으로 덮어쓰지 마세요.\n\n" +
    "유예 시간이 지난 이전 refreshToken을 재사용하면 HTTP 401과 TOKEN_REUSE 코드를 반환합니다.",
  security: [],
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: RefreshBodySchema,
          example: {
            refreshToken: "eyJhbGciOiJIUzI1NiIs...",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "토큰 재발급 성공",
      content: {
        "application/json": {
          schema: TokenResponseSchema,
          examples: {
            rotation: {
              summary: "최초 갱신: 새 토큰 쌍 발급",
              value: {
                accessToken: "eyJhbGciOiJIUzI1NiIs...",
                refreshToken: "eyJhbGciOiJIUzI1NiIs...",
              },
            },
            gracePeriod: {
              summary: "10초 유예 시간 내 재요청: 액세스 토큰만 발급",
              value: {
                accessToken: "eyJhbGciOiJIUzI1NiIs...",
                refreshToken: null,
              },
            },
          },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "유효하지 않은 토큰",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

auth.openapi(refreshRoute, async (c) => {
  const { teamId } = c.req.valid("param");
  const { refreshToken } = c.req.valid("json");
  const result = await authService.refresh(teamId, refreshToken);
  return c.json(result, 200);
});

// POST /{teamId}/auth/logout
const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "로그아웃",
  description:
    "refreshToken을 서버에서 삭제하여 로그아웃합니다. " +
    "accessToken은 만료 시간까지 유효합니다.",
  security: [],
  request: {
    params: TeamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: RefreshBodySchema,
          example: {
            refreshToken: "eyJhbGciOiJIUzI1NiIs...",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "로그아웃 성공",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
          example: {
            message: "Logged out successfully",
          },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

auth.openapi(logoutRoute, async (c) => {
  const { teamId } = c.req.valid("param");
  const { refreshToken } = c.req.valid("json");
  await authService.logout(teamId, refreshToken);
  return c.json({ message: "Logged out successfully" }, 200);
});

// POST /{teamId}/oauth/{provider} — separate router, PRD path
const oauthRoute = createRoute({
  method: "post",
  path: "/{provider}",
  tags: ["Auth"],
  summary: "OAuth 로그인",
  description:
    "Google 또는 Kakao OAuth 액세스 토큰으로 로그인합니다. " +
    "최초 로그인 시 자동으로 계정이 생성되며, 이후에는 프로필 정보가 업데이트됩니다. " +
    "같은 이메일로 이메일 가입 계정이 이미 있으면 409 에러가 발생합니다.",
  security: [],
  request: {
    params: TeamIdParamSchema.merge(OAuthProviderParamSchema),
    body: {
      content: {
        "application/json": {
          schema: OAuthBodySchema,
          example: {
            token: "ya29.a0AfH6SM...",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "OAuth 로그인 성공",
      content: {
        "application/json": {
          schema: AuthResponseSchema,
          example: {
            accessToken: "eyJhbGciOiJIUzI1NiIs...",
            refreshToken: "eyJhbGciOiJIUzI1NiIs...",
            user: {
              id: 1,
              email: "user@example.com",
              name: "홍길동",
              image: null,
            },
          },
        },
      },
    },
    400: {
      description: "요청 데이터가 유효하지 않음",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "OAuth 인증 실패",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

oauth.openapi(oauthRoute, async (c) => {
  const { teamId, provider } = c.req.valid("param");
  const { token } = c.req.valid("json");
  const result = await authService.oauthLogin(teamId, provider, token);
  return c.json(result, 200);
});
