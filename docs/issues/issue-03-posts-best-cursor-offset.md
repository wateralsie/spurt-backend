# #3 [BE] GET /posts?type=best — cursor가 ID가 아닌 오프셋으로 동작

- **Label**: bug
- **State**: OPEN
- **Created**: 2026-02-20
- **URL**: https://github.com/woozoobro/slid-to-do/issues/3

---

## 문제

`type=all`과 `type=best`에서 `cursor` 파라미터의 의미가 완전히 다르다.

| type | cursor 의미 | nextCursor |
|------|------------|------------|
| `all` | 마지막 아이템의 ID | 다음 페이지 시작 ID |
| `best` | 건너뛸 항목 수 (offset) | skip + limit |

## 재현

```
# type=all (ID 커서)
GET /posts?type=all&limit=3           → nextCursor=8  (id=8인 게시글 이후부터)
GET /posts?type=all&limit=3&cursor=8  → WHERE id < 8 ORDER BY id DESC

# type=best (오프셋)
GET /posts?type=best&limit=3          → nextCursor=3  (3개 건너뛰어)
GET /posts?type=best&limit=3&cursor=3 → SKIP 3 ORDER BY viewCount DESC
```

## 문제점

1. 클라이언트가 `type` 값에 따라 `cursor`를 다르게 해석해야 하지만 API 계약에 명시되지 않음
2. 오프셋 방식은 `viewCount` 변동 시 페이지 간 중복/누락 발생
3. `nextCursor=3`이 ID처럼 보여 혼동 발생

## 원인

```ts
// posts.service.ts:119
const cursorWhere = !isBest && cursor
  ? { ...filterWhere, id: { lt: cursor } }  // type=all: ID 커서
  : filterWhere;
const skip = isBest && cursor ? cursor : 0; // type=best: 오프셋

nextCursor = isBest ? skip + limit : items[items.length - 1].id;
```

## 수정 방향

- `type=best`에 `page` 파라미터를 별도 도입해 오프셋임을 명시
- 또는 `(viewCount DESC, id DESC)` 복합 커서를 사용해 ID 커서 방식으로 통일

## 관련 파일

- `backend/src/services/posts.service.ts` (line 119~141)
