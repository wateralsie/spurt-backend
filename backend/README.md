# Slid To-Do — Backend

Bun + Hono + Prisma 기반 REST API 서버.

## 기술 스택

- **런타임**: Bun
- **프레임워크**: Hono
- **ORM**: Prisma 7
- **DB**: PostgreSQL (AWS RDS)
- **인증**: JWT (access + refresh), OAuth (Google / Kakao)
- **스토리지**: AWS S3
- **API 문서**: Swagger (`/docs`)

## 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
bun install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local`을 열고 각 값을 채웁니다.

| 변수 | 설명 |
| ---- | ---- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `DIRECT_URL` | Prisma 마이그레이션용 직접 연결 URL |
| `JWT_SECRET` | Access 토큰 서명 키 |
| `JWT_REFRESH_SECRET` | Refresh 토큰 서명 키 |
| `S3_ACCESS_KEY_ID` | AWS S3 액세스 키 |
| `S3_SECRET_ACCESS_KEY` | AWS S3 시크릿 키 |
| `S3_BUCKET` | S3 버킷 이름 |
| `S3_REGION` | S3 리전 (기본값: `ap-northeast-2`) |
| `S3_KEY_PREFIX` | S3 업로드 경로 prefix |

Google/Kakao OAuth를 사용하려면 해당 항목도 채웁니다.

### 3. DB 마이그레이션

```bash
bunx prisma migrate deploy
```

> `backend/` 디렉토리 안에서 실행해야 합니다.

초기 데이터가 필요한 경우:

```bash
bun run seed
```

### 4. 서버 실행

```bash
bun dev
```

서버가 `http://localhost:4000`에서 실행됩니다.

## API 문서

서버 실행 후 브라우저에서 접속:

```
http://localhost:4000/docs
```

OpenAPI 스펙(JSON):

```
http://localhost:4000/openapi.json
```

## 주요 스크립트

| 명령어 | 설명 |
| ------ | ---- | 
| `bun dev` | 개발 서버 실행 (hot reload) |
| `bun run seed` | 초기 데이터 삽입 |
| `bunx prisma migrate dev` | 마이그레이션 생성 및 적용 |
| `bunx prisma migrate deploy` | 마이그레이션 적용 (프로덕션) |
| `bunx prisma studio` | Prisma Studio (DB GUI) 실행 |
