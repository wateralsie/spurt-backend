---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git checkout:*), Bash(git pull:*), Bash(git merge:*), Bash(git branch:*), Bash(git push:*), Bash(git rev-parse:*)
description: 현재 feature 브랜치를 develop에 merge 후 삭제
---

# Feature Finish

현재 feature 브랜치를 develop에 merge하고 브랜치를 삭제합니다.

## 현재 상태
- 현재 브랜치: !`git branch --show-current`
- 변경사항: !`git status --short`
- Git root: !`git rev-parse --show-toplevel`
- 현재 pwd: !`pwd`

## 사전 확인
1. **pwd가 git root와 같아야 함** → 다르면 **중단**
2. **현재 브랜치가 `feature/`로 시작해야 함** → 아니면 **중단**

모노레포에서 서브디렉토리에서 실행하면 안 됩니다. 반드시 레포 root에서 실행해야 합니다.

**조건 불충족 시 중단하고 사용자에게 알려주세요.**

## 실행할 작업

### 실행 순서
1. 현재 브랜치가 `feature/`로 시작하는지 확인 → 아니면 **중단**
2. 커밋되지 않은 변경사항 확인 → **있으면 /commit 방식으로 자동 커밋 후 진행**
3. develop 브랜치로 checkout
4. 최신 변경사항 pull
5. feature 브랜치를 --no-ff 옵션으로 merge
6. feature 브랜치 삭제
7. develop push

### 명령어
```bash
# 현재 브랜치 저장
CURRENT_BRANCH=$(git branch --show-current)

# merge 및 정리
git checkout develop
git pull origin develop
git merge --no-ff "$CURRENT_BRANCH" -m "Merge branch '$CURRENT_BRANCH' into develop"
git branch -d "$CURRENT_BRANCH"
git push origin develop
```

### 에러 처리
- **git root가 아님**: 작업 중단, `cd <git root>` 안내
- **feature 브랜치가 아님**: 작업 중단, 사용자에게 현재 브랜치 알림
- **merge 충돌 발생**: 충돌 해결 안내

위 작업을 순서대로 실행해주세요.
