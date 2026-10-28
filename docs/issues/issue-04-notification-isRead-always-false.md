# #4 [BE] Notification.isRead 필드가 항상 false — 읽음 처리 API 없음

- **Label**: enhancement
- **State**: OPEN
- **Created**: 2026-02-20
- **URL**: https://github.com/woozoobro/slid-to-do/issues/4

---

## 현황

`Notification` 모델에 `isRead Boolean @default(false)` 필드가 있지만, 이를 `true`로 업데이트하는 API가 없다.
모든 알림은 영구적으로 `isRead: false` 상태로 고정된다.

```prisma
// schema.prisma:169
isRead  Boolean  @default(false)
```

## 선택지

1. **필드 제거**: PRD에 읽음 처리 기능 명세 없음 → dead column 삭제
2. **읽음 처리 API 추가**: `PATCH /{teamId}/notifications/:id/read` 또는 `PATCH /{teamId}/notifications/:id` (isRead 업데이트)
3. **명시적 TODO 주석 추가**: 향후 기능으로 표시

## 관련 파일

- `backend/prisma/schema.prisma` (line 169)
- `backend/src/services/notifications.service.ts`
