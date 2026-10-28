# 개발 요청서 - 슬리드투두 (할 일 관리 서비스)

## 1. 프로젝트 개요

사용자들이 목표와 할 일을 관리할 수 있는 서비스

- **서비스 형태**: 웹 서비스
- **대상 사용자**: 프론트엔드 부트캠프 수강생
- **팀 단위 서비스**: 모든 API는 `{teamId}` Path Parameter를 포함합니다.
    - 본 서비스는 여러 팀이 동일한 시스템을 공유하는 환경을 가정합니다. 따라서 **팀 간 데이터 간섭을 방지하고 독립적인 개발 환경을 보장**하기 위해 다음과 같은 제약 사항을 준수해야 합니다.
        - **Path Parameter:** 모든 API 경로는 `{teamId}`를 포함하여 요청을 구분합니다.
        - **데이터 격리:** 모든 데이터베이스 레코드는 생성 시 `teamId`를 식별자로 포함해야 하며, 조회/수정/삭제 시 반드시 해당 팀의 데이터만 노출되도록 논리적으로 격리되어야 합니다.
- **API 문서**: Swagger 기반으로 제공 예정
- **마감기한**: ~2월 27일

---

## 2. 디자인 자료

- https://www.figma.com/design/S2uLVzsgkn0wpdol9jUF2G/-KDT-%EB%8B%A8%EA%B8%B0%EC%8B%AC%ED%99%94--%EC%8A%AC%EB%A6%AC%EB%93%9C-%ED%88%AC-%EB%91%90?node-id=11772-18587&p=f&t=DPIgP6B4hxJCyw4a-0

---

## 3. API 규칙

- 모든 API는 **`/{teamId}`를 Path Parameter로 포함**
- 인증이 필요한 API는 `Authorization: Bearer {accessToken}` 사용
- 기능 설명의 명세 구현을 위해 추가적으로 필요한 엔드포인트가 있다면 추가(어떤 것을 추가했는지 명확하게 명시)
- 구현의 불필요하다고 판단한 경우에는 생략 (어떤 것을 생략했는지 명확하게 명시)
- API
- 응답 포맷은 JSON
- 적절한 에러 응답이 필요하며 공통 포맷 사용 권장

```json
{
	"message":"에러 메시지",
	"code":"ERROR_CODE"
}
```

---

## 4. API 명세

### 1️⃣ 인증 / 회원 (Auth)

### 일반 회원가입 / 로그인

- **[POST]** `/{teamId}/auth/signup`
- **[POST]** `/{teamId}/auth/login`
- **[POST]** `/{teamId}/auth/logout`
- **[POST]** `/{teamId}/auth/refresh`

### 소셜 로그인 / 회원가입 (구글 / 카카오)

- **POST** `/{teamId}/oauth/{provider}`

---

### 2️⃣ 알림

### 알림

- **[GET]** `/{teamId}/notifications`
- **[DELETE]** `/{teamId}/notifications`
- **[DELETE]** `/{teamId}/notifications/{notificationId}`

---

### 3️⃣ 목표

### 목표

- **GET** `/{teamId}/goals`
- **GET** `/{teamId}/goals/{goalId}`

### 목표 생성 / 수정 / 삭제

- **POST** `/{teamId}/goals`
- **PATCH** `/{teamId}/goals/{goalId}`
- **DELETE** `/{teamId}/goals/{goalId}`

### 

### 4️⃣ 할 일

### 할 일

- **GET** `/{teamId}/todos`
- **GET** `/{teamId}/todos/{todoId}`

### 할 일 생성 / 수정 / 삭제

- **POST** `/{teamId}/todos`
- **PATCH** `/{teamId}/todos/{todoId}`
- **DELETE** `/{teamId}/todos/{todoId}`

### 

### 5️⃣ 노트

### 노트

- **GET** `/{teamId}/notes`
- **GET** `/{teamId}/notes/{noteId}`

### 노트 생성 / 수정 / 삭제

- **POST** `/{teamId}/notes`
- **PATCH** `/{teamId}/notes/{noteId}`
- **DELETE** `/{teamId}/notes/{noteId}`

---

### 6️⃣ 찜한 할 일

- **POST** `/{teamId}/todos/{todoId}/favorites`
- **DELETE** `/{teamId}/todos/{todoId}/favorites`
- **GET** `/{teamId}/todos/favorites`

---

### 7️⃣ 마이페이지 (My)

### 내 프로필

- **GET** `/{teamId}/users/me`
- **PATCH** `/{teamId}/users/me`

---

### 8️⃣ 소통 게시판 (Community)

### 게시글

- **GET** `/{teamId}/posts`
    - query: `type=all | best`
- **POST** `/{teamId}/posts`
- **GET** `/{teamId}/posts/{postId}`
- **PATCH** `/{teamId}/posts/{postId}`
- **DELETE** `/{teamId}/posts/{postId}`

### 댓글

- **GET** `/{teamId}/posts/{postId}/comments`
- **POST** `/{teamId}/posts/{postId}/comments`
- **DELETE** `/{teamId}/posts/{postId}/comments/{commentId}`

---

### 9️⃣ 기타 / 보조

### 이미지 업로드

- **POST** `/{teamId}/images`

### 파일 업로드

- **POST** `/{teamId}/files`

---

## 5. 기능 체크리스트

## 0. 공통 (모든 API)

- [x]  인증 필요 API는 토큰 없으면 401 반환
- [x]  잘못된 teamId 접근 시 차단됨
- [x]  요청/응답 포맷(JSON, status code) 일관됨
- [x]  존재하지 않는 리소스 접근 시 404 반환
- [x]  본인 소유 리소스만 수정/삭제 가능

---

## 1. Auth / 회원

### 회원가입

- [x]  정상 가입 가능
- [x]  필수값 누락 시 실패
- [x]  중복 이메일 가입 불가

### 로그인 / 로그아웃

- [x]  정상 로그인 시 토큰 발급
- [x]  잘못된 계정 정보 로그인 실패
- [x]  로그아웃 후 토큰 사용 불가

### 토큰 재발급

- [x]  refresh 토큰으로 access 재발급 가능
- [x]  만료/위조 refresh 토큰 거부

### OAuth

- [x]  구글/카카오 로그인 성공
- [x]  첫 소셜 로그인 시 회원 자동 생성
- [x]  기존 소셜 유저 재로그인 가능

---

## 2. 알림

- [x]  알림 목록 조회 가능
- [x]  알림 단건 삭제 가능
- [x]  전체 알림 삭제 가능
- [x]  다른 유저 알림 접근 불가

---

## 3. 목표 (Goals)

- [x]  목표 목록 조회 가능
- [x]  목표 상세 조회 가능
- [x]  목표 생성 가능
- [x]  목표 수정 가능
- [x]  목표 삭제 가능

---

## 4. 할 일 (Todos)

- [x]  할 일 목록 조회 가능
- [x]  할 일 상세 조회 가능
- [x]  할 일 생성 가능
- [x]  할 일 수정 가능
- [x]  할 일 삭제 가능

---

## 5. 노트 (Notes)

- [x]  노트 목록 조회 가능
- [x]  노트 상세 조회 가능
- [x]  노트 생성 가능
- [x]  노트 수정 가능
- [x]  노트 삭제 가능

---

## 6. 찜한 할 일 (Favorites)

- [x]  할 일 찜하기 가능
- [x]  찜 해제 가능
- [x]  찜한 할 일 목록 조회 가능
- [x]  같은 할 일 중복 찜 불가

---

## 7. 마이페이지

- [x]  내 프로필 조회 가능
- [x]  내 프로필 수정 가능

---

## 8. 커뮤니티 (게시판)

### 게시글

- [x]  게시글 목록 조회 가능
- [x]  게시글 상세 조회 가능
- [x]  게시글 작성 가능
- [x]  게시글 수정/삭제 가능 (작성자만)

### 댓글

- [x]  댓글 목록 조회 가능
- [x]  댓글 작성 가능
- [x]  댓글 삭제 가능 (작성자만)

---

## 9. 업로드

- [x]  이미지 업로드 성공
- [x]  파일 업로드 성공
- [x]  업로드 실패 시 에러 반환

## 6. 기술 스택

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Bun, Hono, Prisma 7, PostgreSQL
- **API 문서**: Swagger (hono-zod-openapi)

---

## 7. 산출물

- [x]  Swagger API 문서
- [x]  API 테스트 가능 환경 (Swagger )
- [x]  기본적인 예외 처리 및 validation
- [x]  프로젝트 요구사항에 대한 테스트 케이스 작성

---

---

## 8. 타임라인

• 2/9 개발 요청서 전달
• 2/20 1차 개발 완료
• ~2/23 코드잇 피드백 
• ~ 2/27피드백 적용

---