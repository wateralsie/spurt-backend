# #1 [BE] POST /todos, PATCH /todos/:id 응답에 goal·noteIds 누락

- **Label**: bug
- **State**: OPEN
- **Created**: 2026-02-20
- **URL**: https://github.com/woozoobro/slid-to-do/issues/1

---

## 문제

`createTodo`와 `updateTodo`가 `select` 없이 Prisma를 호출하므로 생성·수정 응답에 `goal`·`noteIds` 필드가 없다.
`GET /todos`, `GET /todos/:id`는 두 필드를 포함하므로 클라이언트에서 혼란이 생긴다.

## 재현

```
POST /{teamId}/todos  → { id, title, done, ... }         ← goal, noteIds 없음
GET  /{teamId}/todos  → { id, title, done, ..., goal: {...}, noteIds: [...] }
```

## 원인

```ts
// todos.service.ts:127
return prisma.todo.create({
  data: { teamId, userId, ...data },
  // select: todoSelect 없음
});

// todos.service.ts:148
const updated = await prisma.todo.update({
  where: { id: todoId },
  data,
  // select: todoSelect 없음
});
```

## 수정 방향

`createTodo`, `updateTodo` 모두 `select: todoSelect` 추가.
라우트 응답 스키마를 `TodoDetailResponseSchema`로 변경.

## 관련 파일

- `backend/src/services/todos.service.ts` (line 127, 148)
