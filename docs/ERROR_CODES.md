# 에러 코드 (Error Codes)

모든 에러 응답은 아래 포맷을 따른다.

```json
{ "message": "에러 상세 메시지", "code": "ERROR_CODE" }
```

- `code`는 [`backend/src/schemas/common.ts`](../backend/src/schemas/common.ts)의 `ERROR_CODES` 레지스트리에서 관리한다.
- Swagger 문서에서도 각 응답의 example 드롭다운으로 가능한 `code`를 확인할 수 있다.
- 전역 에러 핸들러: [`backend/src/middlewares/error-handler.ts`](../backend/src/middlewares/error-handler.ts)

---

## 공통 에러 (전역 핸들러 / 미들웨어)

모든 엔드포인트에서 발생 가능하다.

| 코드 | HTTP | 메시지 | 발생 조건 |
|------|------|--------|----------|
| `VALIDATION_ERROR` | 400 | (Zod 검증 메시지) | 요청 스키마 유효성 검사 실패 |
| `HTTP_ERROR` | (가변) | HTTPException 메시지 | Hono HTTPException |
| `DUPLICATE_ENTRY` | 409 | Unique constraint failed on: {fields} | Prisma P2002 (유니크 제약 위반) |
| `NOT_FOUND` | 404 | Record not found | Prisma P2025 (레코드 없음) |
| `INTERNAL_ERROR` | 500 | Internal Server Error | 처리되지 않은 예외 |
| `TOKEN_INVALID` | 401 | Authentication required / Invalid or expired token | 인증 헤더 없음·토큰 검증 실패 |
| `TEAM_MISMATCH` | 403 | Token does not belong to this team | 토큰 teamId ≠ 경로 teamId |

---

## 도메인별 에러

### 1. Auth (인증)

| 코드 | HTTP | 발생 조건 |
|------|------|----------|
| `DUPLICATE_EMAIL` | 409 | 회원가입 이메일 중복 / OAuth 가입 시 다른 계정과 이메일 충돌 |
| `INVALID_CREDENTIALS` | 401 | 로그인 이메일/비밀번호 불일치 |
| `TOKEN_INVALID` | 401 | refresh 토큰 무효·팀 불일치 |
| `TOKEN_EXPIRED` | 401 | refresh 토큰 만료 |
| `TOKEN_REUSE` | 401 | refresh 토큰 재사용 감지 (전 세션 폐기) |
| `OAUTH_FAILED` | 401 | OAuth 공급자(Google/Kakao) 사용자 정보 조회 실패·이메일 권한 미동의 |

### 2. Users/Me (사용자 프로필)

| 코드 | HTTP | 발생 조건 |
|------|------|----------|
| `NOT_FOUND` | 404 | 사용자 없음 |
| `OAUTH_ACCOUNT` | 400 | OAuth 계정은 비밀번호 변경 불가 |
| `INVALID_CREDENTIALS` | 401 | 현재 비밀번호 불일치 |

### 3. Goals / Todos / Notes / Favorites / Notifications / Posts / Comments

리소스 접근 계열 공통 패턴.

| 코드 | HTTP | 발생 조건 |
|------|------|----------|
| `NOT_FOUND` | 404 | 해당 리소스(Goal/Todo/Note/Favorite/Notification/Post/Comment) 없음 |
| `FORBIDDEN` | 403 | 다른 사용자 소유 리소스 접근 |
| `TEAM_MISMATCH` | 403 | 토큰의 팀과 경로의 팀 불일치 (미들웨어) |

추가 케이스:

| 코드 | HTTP | 발생 조건 |
|------|------|----------|
| `DUPLICATE_ENTRY` | 409 | Favorites 중복 찜 등 유니크 제약 위반 |
| `INVALID_CURSOR` | 400 | Posts 목록 / Comments 목록의 커서 디코딩 실패 |

> Todos는 `goalId` 연결 시 해당 Goal에 대해, Notes는 `todoId` 연결 시 해당 Todo에 대해 동일하게 `NOT_FOUND` / `FORBIDDEN`이 발생한다.

### 4. Uploads (업로드)

| 코드 | HTTP | 발생 조건 |
|------|------|----------|
| `INVALID_IMAGE_EXTENSION` | 400 | 허용 외 확장자 (jpg·jpeg·png·gif·webp·svg만 허용) |

---

## 전체 코드 목록 (16개)

| 코드 | HTTP |
|------|------|
| `VALIDATION_ERROR` | 400 |
| `HTTP_ERROR` | 가변 |
| `DUPLICATE_ENTRY` | 409 |
| `NOT_FOUND` | 404 |
| `INTERNAL_ERROR` | 500 |
| `TOKEN_INVALID` | 401 |
| `TEAM_MISMATCH` | 403 |
| `DUPLICATE_EMAIL` | 409 |
| `INVALID_CREDENTIALS` | 401 |
| `TOKEN_REUSE` | 401 |
| `TOKEN_EXPIRED` | 401 |
| `OAUTH_ACCOUNT` | 400 |
| `OAUTH_FAILED` | 401 |
| `FORBIDDEN` | 403 |
| `INVALID_CURSOR` | 400 |
| `INVALID_IMAGE_EXTENSION` | 400 |

> 코드를 추가·변경할 때는 `backend/src/schemas/common.ts`의 `ERROR_CODES`를 단일 출처로 수정하고, 라우트의 `errorResponse(...)` 호출에 반영한 뒤 이 문서를 갱신한다.
