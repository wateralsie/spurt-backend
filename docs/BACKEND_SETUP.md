# Backend 구조 가이드

> dallaem 프로젝트 기반 레퍼런스

## 디렉토리 구조

```
backend/
├── package.json
├── tsconfig.json
├── prisma.config.ts          # Prisma 설정 (migration URL 등)
├── src/
│   ├── index.ts              # Vercel 진입점: export default app
│   ├── dev.ts                # 개발 서버: bun --hot
│   ├── app.ts                # Hono 앱 (CORS, Swagger, 라우트 등록)
│   ├── routes/
│   │   ├── index.ts          # 라우트 모아서 /:teamId/* 로 마운트
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── goals.ts
│   │   ├── todos.ts
│   │   ├── notes.ts
│   │   ├── posts.ts
│   │   ├── notifications.ts
│   │   ├── images.ts
│   │   └── files.ts
│   ├── services/             # 비즈니스 로직 (DB 조작)
│   │   ├── auth.service.ts
│   │   ├── goal.service.ts
│   │   ├── todo.service.ts
│   │   ├── note.service.ts
│   │   ├── post.service.ts
│   │   ├── notification.service.ts
│   │   └── favorite.service.ts
│   ├── schemas/              # Zod + OpenAPI 스키마
│   │   └── common.ts         # ErrorResponse, TeamIdParam, Pagination
│   ├── middlewares/
│   │   ├── auth.ts           # JWT 검증 (authMiddleware, optionalAuthMiddleware)
│   │   └── error-handler.ts  # ZodError, ApiError, HTTPException 통합 처리
│   └── lib/
│       ├── prisma.ts         # Prisma 클라이언트 (PrismaPg 어댑터)
│       ├── jwt.ts            # 토큰 생성/검증 (hono/jwt)
│       ├── api-error.ts      # ApiError 커스텀 에러 클래스
│       └── oauth.ts          # Google/Kakao OAuth
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── generated/prisma/         # bunx prisma generate 시 자동 생성
```

## package.json 스크립트

```json
{
  "scripts": {
    "dev": "bun --hot src/dev.ts",
    "build": "bun build src/index.ts --outfile=api/index.js --target=node --format=esm",
    "postinstall": "bunx prisma generate",
    "seed": "bun prisma/seed.ts",
    "test": "bun test"
  }
}
```

## 핵심 파일 레퍼런스

### src/index.ts (Vercel 진입점)

```ts
import { Hono } from "hono"; // Vercel Hono 감지용
import { app } from "./app";
export default app;
```

### src/dev.ts (개발 서버)

```ts
import { app } from "./app";
const port = Number(process.env.PORT) || 4000;
console.log(`Server running at http://localhost:${port}`);
export default { port, fetch: app.fetch };
```

### src/app.ts (메인 앱)

```ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { errorHandler } from "./middlewares/error-handler";
import { routes } from "./routes";

const app = new OpenAPIHono();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.onError(errorHandler);
app.route("/", routes);

// OpenAPI + Swagger
app.doc("/doc", { openapi: "3.1.0", info: { title: "Slid To Do API", version: "1.0.0" }, ... });
app.get("/ui", swaggerUI({ url: "/doc" }));

// Health check
app.get("/", (c) => c.json({ status: "ok", ts: Date.now() }));

export { app };
```

### src/routes/index.ts (라우트 취합)

```ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { authRoutes } from "./auth";
import { goalRoutes } from "./goals";
import { todoRoutes } from "./todos";
// ...

const routes = new OpenAPIHono();
routes.route("/:teamId/auth", authRoutes);
routes.route("/:teamId/goals", goalRoutes);
routes.route("/:teamId/todos", todoRoutes);
// ...
export { routes };
```

### src/lib/api-error.ts

```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
```

### src/middlewares/error-handler.ts

```ts
import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { ApiError } from "../lib/api-error";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return c.json({ code: "VALIDATION_ERROR", message: err.message }, 400);
  }
  if (err instanceof ApiError) {
    return c.json({ code: err.code, message: err.message }, err.status as ContentfulStatusCode);
  }
  if (err instanceof HTTPException) {
    return c.json({ code: "HTTP_ERROR", message: err.message }, err.status);
  }
  console.error(err);
  return c.json({ code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" }, 500);
};
```

### src/middlewares/auth.ts

```ts
import type { Context, Next } from "hono";
import { verifyAccessToken, type JwtPayload } from "../lib/jwt";
import { ApiError } from "../lib/api-error";

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "인증이 필요합니다.");
  }
  try {
    const payload = await verifyAccessToken(authHeader.slice(7));
    c.set("user", payload);
    await next();
  } catch {
    throw new ApiError(401, "TOKEN_INVALID", "유효하지 않은 토큰입니다.");
  }
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      c.set("user", payload);
    } catch {}
  }
  await next();
}
```

### src/lib/jwt.ts

```ts
import { sign, verify } from "hono/jwt";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRES_IN = 15 * 60;      // 15분
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 3600; // 7일

export interface JwtPayload {
  sub: number;
  teamId: string;
  email: string;
  iat: number;
  exp: number;
}

export async function generateAccessToken(userId: number, teamId: string, email: string) {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, teamId, email, iat: now, exp: now + ACCESS_TOKEN_EXPIRES_IN }, JWT_SECRET);
}

export async function generateRefreshToken(userId: number, teamId: string, email: string) {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, teamId, email, iat: now, exp: now + REFRESH_TOKEN_EXPIRES_IN }, JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  return (await verify(token, JWT_SECRET, "HS256")) as unknown as JwtPayload;
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  return (await verify(token, JWT_REFRESH_SECRET, "HS256")) as unknown as JwtPayload;
}
```

### src/lib/prisma.ts

```ts
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### src/schemas/common.ts

```ts
import { z } from "@hono/zod-openapi";

export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
}).openapi("ErrorResponse");

export const TeamIdParamSchema = z.object({
  teamId: z.string().openapi({
    param: { name: "teamId", in: "path" },
    example: "slid-to-do",
  }),
});

export const CursorPaginationQuerySchema = z.object({
  cursor: z.string().optional().openapi({
    param: { name: "cursor", in: "query" },
    description: "다음 페이지를 위한 커서",
  }),
  size: z.coerce.number().int().min(1).max(100).default(10).openapi({
    param: { name: "size", in: "query" },
    description: "페이지 크기 (1-100)",
  }),
});
```

### prisma.config.ts

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DIRECT_URL"] },
});
```

## Prisma schema.prisma (generator + datasource)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

> `datasource`에 `url` 없음 — `prisma.config.ts`에서 런타임으로 주입

## 환경변수 (.env.example)

```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="..."
KAKAO_CLIENT_ID="..."
KAKAO_CLIENT_SECRET="..."
KAKAO_CALLBACK_URL="..."
STORAGE_PROVIDER="s3"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_BUCKET="..."
S3_REGION="ap-northeast-2"
APP_URL="https://..."
FRONTEND_URL="https://..."
```
