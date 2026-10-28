# #2 [BE] POST /notes 응답에 todo 누락

- **Label**: bug
- **State**: OPEN
- **Created**: 2026-02-20
- **URL**: https://github.com/woozoobro/slid-to-do/issues/2

---

## 문제

`createNote`가 `select` 없이 Prisma를 호출하므로 생성 응답에 `todo` 필드가 없다.
`GET /notes`, `GET /notes/:id`는 `todo` 정보를 포함하므로 불일치가 발생한다.

## 재현

```
POST /{teamId}/notes  → { id, todoId, title, content, ... }          ← todo 없음
GET  /{teamId}/notes  → { id, todoId, title, content, ..., todo: { id, title, done } }
```

## 원인

```ts
// notes.service.ts:97
return prisma.note.create({
  data: { teamId, userId, ...data },
  // select 없음 → todo 미포함
});
```

## 수정 방향

`createNote`에 `select: noteSelect` 추가.
라우트 응답 스키마를 `NoteDetailSchema`로 변경.

## 관련 파일

- `backend/src/services/notes.service.ts` (line 97)
