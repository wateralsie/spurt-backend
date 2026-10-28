# #5 [BE] optionalAuthMiddleware 정의만 있고 어디서도 사용 안 됨

- **Label**: enhancement
- **State**: OPEN
- **Created**: 2026-02-20
- **URL**: https://github.com/woozoobro/slid-to-do/issues/5

---

## 현황

`optionalAuthMiddleware`가 정의되어 있지만 어떤 라우트에도 적용되지 않는 dead code다.

```ts
// middlewares/auth.ts:35
export const optionalAuthMiddleware: MiddlewareHandler = async (c, next) => {
  // ...
};
```

## 선택지

1. **삭제**: 사용처가 없으면 제거
2. **활용**: 인증이 선택적인 엔드포인트(예: 게시글 공개 조회)에 적용

현재 모든 엔드포인트가 `authMiddleware`(필수 인증)를 사용하므로, 인증 없이도 조회 가능해야 하는 리소스가 있다면 이 미들웨어를 활용하는 방향으로 검토.

## 관련 파일

- `backend/src/middlewares/auth.ts` (line 35~48)
