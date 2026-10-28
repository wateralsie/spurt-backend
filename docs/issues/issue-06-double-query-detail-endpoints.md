# #6 [BE] 상세 조회 시 Double Query — 권한 확인 + 데이터 조회 분리

- **Label**: enhancement
- **State**: OPEN
- **Created**: 2026-02-20
- **URL**: https://github.com/woozoobro/slid-to-do/issues/6

---

## 현황

`getGoal`, `getTodo`, `getNote` 세 서비스가 상세 조회 시 DB 쿼리를 두 번 실행한다.

```ts
// goals.service.ts:64
async function getGoal(teamId, goalId, userId) {
  await findGoalOrThrow(teamId, goalId, userId); // 1차: findFirst (권한 확인)
  return prisma.goal.findUniqueOrThrow({ ... }); // 2차: findUniqueOrThrow (데이터)
}
```

`getTodo`, `getNote`도 동일한 패턴.

## 수정 방향

`findUniqueOrThrow`로 데이터를 한 번에 가져온 뒤 인라인으로 권한 검사:

```ts
async function getGoal(teamId, goalId, userId) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, teamId },
    include: { todos: { ... } },
  });
  if (!goal) throw new ApiError(404, 'Goal not found', 'NOT_FOUND');
  if (goal.userId !== userId) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  return goal;
}
```

## 관련 파일

- `backend/src/services/goals.service.ts` (line 64)
- `backend/src/services/todos.service.ts` (line 105)
- `backend/src/services/notes.service.ts` (line 78)
