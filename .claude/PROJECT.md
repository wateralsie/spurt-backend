# 슬리드투두 (Slid To-Do)

할 일·목표 관리 웹 서비스. 프론트엔드 부트캠프 수강생 대상 백엔드 API 제공.

## 핵심 제약

- **멀티테넌트**: 모든 API 경로에 `/{teamId}` 포함, 데이터는 teamId로 격리
- **인증**: JWT (access + refresh), OAuth (Google/Kakao)
- **마감**: 2/20 1차 완료 → 2/27 최종

## 기술 스택

| 계층 | 스택 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Bun, Hono, TypeScript |
| ORM/DB | Prisma 7, PostgreSQL |
| API 문서 | Swagger (hono-zod-openapi) |
| 인증 | bcrypt, JWT |

## 프로젝트 구조

```
frontend/       Next.js app (app router)
backend/
  src/          Hono 서버
  prisma/       Prisma schema
docs/           PRD, 셋업 가이드
```

## API 도메인 (9개)

1. **Auth** — 회원가입, 로그인, 로그아웃, 토큰 재발급, OAuth
2. **Notifications** — 알림 조회/삭제
3. **Goals** — 목표 CRUD
4. **Todos** — 할 일 CRUD
5. **Notes** — 노트 CRUD (할 일에 연결)
6. **Favorites** — 할 일 찜하기
7. **Users/Me** — 내 프로필 조회/수정
8. **Posts/Comments** — 소통 게시판
9. **Uploads** — 이미지/파일 업로드

## 에러 응답 포맷

```json
{ "message": "에러 메시지", "code": "ERROR_CODE" }
```

## 상세 명세

→ `docs/PRD.md`
