# #9 [BE] Comment 모델에 teamId 인덱스 없음

- **Label**: enhancement
- **State**: OPEN
- **Created**: 2026-02-20
- **URL**: https://github.com/woozoobro/slid-to-do/issues/9

---

## 현황

`Comment` 모델에 `postId` 인덱스만 있고 `teamId` 관련 인덱스가 없다.

```prisma
// schema.prisma:157
model Comment {
  // ...
  @@index([postId])  // ← teamId 인덱스 없음
}
```

`listComments`·`findCommentOrThrow`가 `{ postId, teamId }` 조건으로 쿼리하는데, `teamId`에 인덱스가 없어 데이터 증가 시 풀스캔 발생 가능.

참고로 `Post` 모델에는 `@@index([teamId])`가 있음.

## 수정 방향

```prisma
model Comment {
  // ...
  @@index([postId])
  @@index([teamId, postId])  // 추가
}
```

이후 `npx prisma migrate dev` 실행 필요.

## 관련 파일

- `backend/prisma/schema.prisma` (line 145~158)
