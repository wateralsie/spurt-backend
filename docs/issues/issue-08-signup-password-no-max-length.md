# #8 [BE] 회원가입 password 최대 길이 제한 없음 — bcrypt 72바이트 한계

- **Label**: bug
- **State**: OPEN
- **Created**: 2026-02-20
- **URL**: https://github.com/woozoobro/slid-to-do/issues/8

---

## 문제

`SignupBodySchema`에 `password`의 최대 길이 제한이 없다.

```ts
// schemas/auth.ts:10
password: z.string().min(8, 'Password must be at least 8 characters')
// ← max() 없음
```

bcrypt는 내부적으로 **72바이트**까지만 처리한다.
72자를 초과하는 비밀번호는 72자 비밀번호와 동일한 해시 결과를 낸다.

## 영향

- `'password123' + (임의의 60자)` 와 `'password123'` + 60자 suffix가 같은 해시
- 사용자가 의도하지 않은 비밀번호 일치가 발생할 수 있음
- 매우 긴 문자열 입력 시 bcrypt 처리 시간 증가 (DoS 가능성 낮지만 존재)

## 수정 방향

```ts
password: z.string().min(8).max(72)
```

## 관련 파일

- `backend/src/schemas/auth.ts` (line 10)
