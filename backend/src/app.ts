import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { errorHandler } from "./middlewares/error-handler.js";
import routes from "./routes/index.js";

const app = new OpenAPIHono();

app.use("*", cors());
app.onError(errorHandler);

app.route("/", routes);

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Access token (login 응답의 accessToken)",
});

app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Slid To-Do API",
    version: "1.0.0",
    description:
      "할 일·목표 관리 서비스 슬리드투두의 REST API입니다. " +
      "모든 경로에 teamId가 포함되며, Auth 엔드포인트를 제외한 모든 요청에 " +
      "Authorization: Bearer {accessToken} 헤더가 필요합니다.\n\n" +
      "## teamId\n" +
      "teamId는 팀별로 고유한 문자열입니다. 프론트엔드 과제에서는 주어진 teamId를 경로에 그대로 사용하세요.\n\n" +
      "## 페이지네이션\n" +
      "대부분의 목록 API는 숫자 ID 기반 커서를 사용합니다. " +
      "Posts·Comments만 인코딩된 문자열 커서를 사용하며, " +
      "두 경우 모두 nextCursor 값을 그대로 다음 요청의 cursor 파라미터에 전달하면 됩니다.\n\n" +
      "## 공통 에러 포맷\n" +
      "모든 에러 응답은 `{ \"message\": \"에러 상세\", \"code\": \"ERROR_CODE\" }` 형태입니다.",
  },
  security: [{ Bearer: [] }],
});

app.get("/docs", swaggerUI({ url: "/openapi.json" }));

// Health check
const version =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.APP_VERSION ??
  "dev";
app.get("/", (c) => c.json({ status: "ok", version }));

export default app;
