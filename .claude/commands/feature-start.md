---
allowed-tools: Bash(git checkout:*), Bash(git pull:*), Bash(git branch:*), Bash(git rev-parse:*)
description: develop에서 feature 브랜치 생성 (자연어 → 브랜치명 자동 변환)
argument-hint: <기능 설명 또는 브랜치명>
---

# Feature Start

develop 브랜치에서 새로운 feature 브랜치를 생성합니다.

## 현재 상태
- 현재 브랜치: !`git branch --show-current`
- Git 상태: !`git status --short`
- 변경된 파일: !`git diff --name-only HEAD`
- Git root: !`git rev-parse --show-toplevel`
- 현재 pwd: !`pwd`

## 사전 확인: 모노레포 root 체크

**pwd가 git root와 다르면 중단하고 사용자에게 알려주세요.**

모노레포에서 서브디렉토리(예: `backend/`, `frontend/`)에서 작업 중일 때 feature 브랜치를 생성하면 혼란이 생길 수 있습니다. 반드시 레포 root에서 실행해야 합니다.

## 브랜치명 결정 우선순위

1. **$ARGUMENTS 있음** → argument로 브랜치명 생성
2. **$ARGUMENTS 없음 + 변경사항 있음** → 변경된 파일 분석해서 브랜치명 자동 생성
3. **$ARGUMENTS 없음 + 변경사항 없음** → 사용자에게 기능 설명 요청

## 실행할 작업

### Case A: develop에서 이미 작업 중인 경우
현재 브랜치가 develop이고 변경사항(staged/unstaged/untracked)이 있으면:
- **pull 하지 않음** (충돌 방지)
- `git checkout -b`로 브랜치 생성 (변경사항 그대로 가져감, stash 불필요)

```bash
git checkout -b feature/<브랜치명>
```

### Case B: 새로 시작하는 경우
변경사항 없이 새로 시작하면:
- develop pull 후 브랜치 생성

```bash
git pull origin develop
git checkout -b feature/<브랜치명>
```

$ARGUMENTS 또는 변경사항을 분석해서 적절한 feature 브랜치명을 생성합니다.

### 브랜치명 생성 규칙
- 이미 kebab-case 형태면 그대로 사용 (예: `kakao-login` → `feature/kakao-login`)
- 자연어 설명이면 적절한 kebab-case로 변환 (예: `카카오 알림톡 기능 추가` → `feature/kakao-alimtalk`)
- 영어 소문자 + 하이픈 조합으로 생성
- 간결하고 명확하게 (2-4 단어 정도)

### 예시
| 입력 | 생성되는 브랜치명 |
|------|------------------|
| `kakao-login` | `feature/kakao-login` |
| `학생 이름 수정 API` | `feature/student-name-update-api` |
| `파일 업로드 용량 제한 해제` | `feature/file-upload-limit` |
| `코치 대시보드 개선` | `feature/coach-dashboard` |

### 실행 순서
1. 브랜치명 결정 (우선순위 참고)
2. 변경사항 유무 확인 → Case A 또는 Case B 선택
3. **확인 없이 즉시 브랜치 생성**

### 에러 처리
- **git root가 아님**: 작업 중단, `cd <git root>` 안내
- **동일한 브랜치명이 이미 존재**: 사용자에게 알림

**확인 없이 바로 실행하세요.**
