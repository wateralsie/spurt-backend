# #7 [BE] PATCH /goals/:goalId — title이 optional 아님 (부분 수정 불가)

- **Label**: bug
- **State**: OPEN
- **Created**: 2026-02-20
- **URL**: https://github.com/woozoobro/slid-to-do/issues/7

---

## 문제

`UpdateGoalBodySchema`에서 `title`이 optional이 아니라 필수다. PATCH 의미론상 모든 필드는 선택적이어야 한다.

```ts
// schemas/goals.ts:11
export const UpdateGoalBodySchema = z.object({
  title: z.string().trim().min(1).max(100), // ← optional() 없음
});
```

Goal의 수정 가능한 필드가 `title`뿐이므로 현재 실질적 문제는 없지만, 향후 필드 추가 시 일관성 문제가 생기고 클라이언트가 title 없이 PATCH를 보내면 400이 반환된다.

## 수정 방향

```ts
export const UpdateGoalBodySchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => data.title !== undefined, {
    message: 'At least one field must be provided',
  });
```

## 관련 파일

- `backend/src/schemas/goals.ts` (line 11~13)
