---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
description: 변경사항 커밋 (상세한 커밋 메시지 자동 생성)
argument-hint: <커밋 내용 설명 (선택)>
---

# Commit

변경사항을 분석하고 상세한 커밋 메시지와 함께 커밋합니다.

## 현재 상태
- 브랜치: !`git branch --show-current`
- 상태: !`git status --short`

## 동작 방식

### Case A: argument 없음
- 모든 변경사항을 분석해서 자동으로 커밋 메시지 생성
- `git add .` 후 커밋

### Case B: argument 있음 ($ARGUMENTS)
- argument를 사용자의 커밋 요청으로 해석
- 요청에 맞는 파일만 선택적으로 커밋하거나, 요청 내용을 커밋 메시지에 반영

## 커밋 메시지 포맷

```
<type>(<scope>): <제목>

<본문 - 변경 내역 상세 설명>
```

### Type 종류
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링 (기능 변경 없음)
- `docs`: 문서 변경
- `style`: 코드 포맷팅, 세미콜론 등
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 파일 등

### Scope 결정 (변경된 파일 경로 기준)
- `frontend/`만 변경 → `fe`
- `backend/`만 변경 → `be`
- 둘 다 변경 → `all`
- 그 외 (docs/, .claude/ 등) → `root`

### 예시
```
feat(fe): 로그인 페이지 추가
fix(be): JWT 토큰 만료 버그 수정
chore(root): gitignore 업데이트
feat(all): 모임 참여 기능 구현
```

### 본문 작성 규칙
- 무엇을 왜 변경했는지 설명
- 파일별 주요 변경사항 나열
- 한글로 작성

## 실행 순서

1. `git status`와 `git diff`로 변경사항 분석
2. 변경된 파일들의 내용을 파악
3. 적절한 type과 상세한 커밋 메시지 작성
4. `git add` 후 커밋

**확인 없이 바로 실행하세요.**
