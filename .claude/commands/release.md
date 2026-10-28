---
allowed-tools: Bash(git:*), Bash(date:*), Bash(VERSION=*)
description: 오늘 날짜로 릴리즈 생성 및 main/develop 배포
---

# Release

오늘 날짜로 릴리즈를 생성하고 main/develop에 배포합니다.

## 현재 상태
- 현재 브랜치: !`git branch --show-current`
- 변경사항: !`git status --short`
- 최근 태그: !`git tag --sort=-creatordate | head -3`
- 오늘 날짜/시간: !`date +%y.%m.%d.%H%M`

## 사전 확인
- develop 브랜치에서 시작해야 함
- 커밋되지 않은 변경사항이 없어야 함

## 실행할 작업

오늘 날짜와 시간을 YY.MM.DD.HHmm 형식으로 버전을 생성합니다. (예: 26.01.21.1430)

### 실행 순서
1. develop 브랜치로 checkout + pull
2. `release/YY.MM.DD.HHmm` 브랜치 생성
3. main에 merge + annotated tag 생성
4. develop에 태그 merge
5. release 브랜치 삭제 + push

### 명령어

```bash
VERSION=$(date +%y.%m.%d.%H%M)

# develop에서 release 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b "release/$VERSION"

# main에 merge + 태그
git checkout main
git pull origin main
git merge --no-ff "release/$VERSION" -m "Merge branch 'release/$VERSION'"
git tag -a "$VERSION" -m "$VERSION"

# develop에 태그 merge
git checkout develop
git merge --no-ff "$VERSION" -m "Merge tag '$VERSION' into develop"

# 정리 및 push
git branch -d "release/$VERSION"
git push origin main develop --tags
```

### 에러 처리
- **커밋되지 않은 변경사항 있음**: 먼저 커밋 또는 stash 권유
- **이미 같은 버전 태그 존재**: 사용자에게 확인 후 진행
- **merge 충돌 발생**: 충돌 해결 안내

위 작업을 순서대로 실행해주세요.
