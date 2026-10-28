import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";
import bcrypt from "bcrypt";

// ─── DB 연결 ───

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");
url.searchParams.delete("sslaccept");

const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── 설정 ───

const TEAM_ID = "slid-to-do-seed";
const DEFAULT_PASSWORD = "test1234";

// ─── Main ───

async function main() {
  console.log("🌱 Seeding started...\n");

  // 기존 seed 데이터 정리 (의존성 역순)
  await prisma.notification.deleteMany({ where: { teamId: TEAM_ID } });
  await prisma.comment.deleteMany({ where: { teamId: TEAM_ID } });
  await prisma.post.deleteMany({ where: { teamId: TEAM_ID } });
  await prisma.favorite.deleteMany({ where: { teamId: TEAM_ID } });
  await prisma.note.deleteMany({ where: { teamId: TEAM_ID } });
  await prisma.todo.deleteMany({ where: { teamId: TEAM_ID } });
  await prisma.goal.deleteMany({ where: { teamId: TEAM_ID } });
  await prisma.refreshToken.deleteMany({
    where: { user: { teamId: TEAM_ID } },
  });
  await prisma.user.deleteMany({ where: { teamId: TEAM_ID } });
  console.log("  ✓ 기존 seed 데이터 정리 완료");

  // ─── 1. Users ───

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        teamId: TEAM_ID,
        email: "kim@example.com",
        name: "김코딩",
        password: hashedPassword,
        provider: "email",
        image: "https://picsum.photos/seed/user1/200",
      },
    }),
    prisma.user.create({
      data: {
        teamId: TEAM_ID,
        email: "lee@example.com",
        name: "이디자인",
        password: hashedPassword,
        provider: "email",
        image: "https://picsum.photos/seed/user2/200",
      },
    }),
    prisma.user.create({
      data: {
        teamId: TEAM_ID,
        email: "park@example.com",
        name: "박기획",
        password: hashedPassword,
        provider: "email",
      },
    }),
  ]);

  const [kim, lee, park] = users;
  console.log(`  ✓ Users ${users.length}명 생성`);

  // ─── 2. Goals ───

  const goals = await Promise.all([
    // 김코딩 목표
    prisma.goal.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        title: "React 기초 마스터하기",
      },
    }),
    prisma.goal.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        title: "TypeScript 심화 학습",
      },
    }),
    prisma.goal.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        title: "포트폴리오 사이트 완성",
      },
    }),
    // 이디자인 목표
    prisma.goal.create({
      data: {
        teamId: TEAM_ID,
        userId: lee.id,
        title: "Figma 활용 능력 향상",
      },
    }),
    prisma.goal.create({
      data: {
        teamId: TEAM_ID,
        userId: lee.id,
        title: "디자인 시스템 구축",
      },
    }),
    // 박기획 목표
    prisma.goal.create({
      data: {
        teamId: TEAM_ID,
        userId: park.id,
        title: "서비스 기획서 작성",
      },
    }),
    prisma.goal.create({
      data: {
        teamId: TEAM_ID,
        userId: park.id,
        title: "사용자 리서치 진행",
      },
    }),
  ]);

  const [
    reactGoal,
    tsGoal,
    portfolioGoal,
    figmaGoal,
    designSystemGoal,
    planDocGoal,
    userResearchGoal,
  ] = goals;
  console.log(`  ✓ Goals ${goals.length}개 생성`);

  // ─── 3. Todos ───

  const todosData = [
    // 김코딩 - React 기초
    { userId: kim.id, goalId: reactGoal.id, title: "JSX 문법 정리", done: true },
    { userId: kim.id, goalId: reactGoal.id, title: "useState, useEffect 예제 만들기", done: true },
    { userId: kim.id, goalId: reactGoal.id, title: "컴포넌트 라이프사이클 이해하기", done: true },
    { userId: kim.id, goalId: reactGoal.id, title: "React Router 실습", done: false },
    { userId: kim.id, goalId: reactGoal.id, title: "Context API로 전역 상태 관리 구현", done: false },

    // 김코딩 - TypeScript 심화
    { userId: kim.id, goalId: tsGoal.id, title: "제네릭 타입 연습문제 풀기", done: true },
    { userId: kim.id, goalId: tsGoal.id, title: "유틸리티 타입 정리 (Partial, Pick, Omit 등)", done: false },
    { userId: kim.id, goalId: tsGoal.id, title: "타입 가드와 타입 좁히기 실습", done: false },
    { userId: kim.id, goalId: tsGoal.id, title: "tsconfig.json 옵션 이해하기", done: false },

    // 김코딩 - 포트폴리오 (전체 완료 목표)
    { userId: kim.id, goalId: portfolioGoal.id, title: "디자인 시안 확정", done: true },
    { userId: kim.id, goalId: portfolioGoal.id, title: "Next.js 프로젝트 세팅", done: true },
    { userId: kim.id, goalId: portfolioGoal.id, title: "메인 페이지 개발", done: true },
    { userId: kim.id, goalId: portfolioGoal.id, title: "프로젝트 소개 섹션 개발", done: true },
    { userId: kim.id, goalId: portfolioGoal.id, title: "배포 및 도메인 연결", done: true },

    // 김코딩 - 목표 없는 할일
    { userId: kim.id, goalId: null, title: "이력서 업데이트", done: false },
    { userId: kim.id, goalId: null, title: "부트캠프 과제 제출", done: true },

    // 이디자인 - Figma
    { userId: lee.id, goalId: figmaGoal.id, title: "오토레이아웃 심화 학습", done: true },
    { userId: lee.id, goalId: figmaGoal.id, title: "컴포넌트 Variants 정리", done: true },
    { userId: lee.id, goalId: figmaGoal.id, title: "프로토타이핑 인터랙션 연습", done: false },
    { userId: lee.id, goalId: figmaGoal.id, title: "플러그인 활용법 정리", done: false },

    // 이디자인 - 디자인 시스템
    { userId: lee.id, goalId: designSystemGoal.id, title: "컬러 팔레트 정의", done: true },
    { userId: lee.id, goalId: designSystemGoal.id, title: "타이포그래피 스케일 설정", done: true },
    { userId: lee.id, goalId: designSystemGoal.id, title: "버튼 컴포넌트 디자인", done: false },
    { userId: lee.id, goalId: designSystemGoal.id, title: "인풋 필드 컴포넌트 디자인", done: false },
    { userId: lee.id, goalId: designSystemGoal.id, title: "아이콘 세트 선정 및 정리", done: false },

    // 이디자인 - 목표 없는 할일
    { userId: lee.id, goalId: null, title: "드리블 포트폴리오 정리", done: false },

    // 박기획 - 서비스 기획서
    { userId: park.id, goalId: planDocGoal.id, title: "경쟁사 분석 자료 정리", done: true },
    { userId: park.id, goalId: planDocGoal.id, title: "핵심 기능 정의서 작성", done: true },
    { userId: park.id, goalId: planDocGoal.id, title: "와이어프레임 초안 작성", done: false },
    { userId: park.id, goalId: planDocGoal.id, title: "사용자 시나리오 작성", done: false },
    { userId: park.id, goalId: planDocGoal.id, title: "기술 요구사항 정리", done: false },

    // 박기획 - 사용자 리서치
    { userId: park.id, goalId: userResearchGoal.id, title: "인터뷰 질문지 작성", done: true },
    { userId: park.id, goalId: userResearchGoal.id, title: "사용자 인터뷰 5명 진행", done: false },
    { userId: park.id, goalId: userResearchGoal.id, title: "설문조사 Google Form 제작", done: true },
    { userId: park.id, goalId: userResearchGoal.id, title: "인터뷰 결과 어피니티 다이어그램 정리", done: false },

    // 박기획 - 목표 없는 할일
    { userId: park.id, goalId: null, title: "주간 회의록 작성", done: false },
    { userId: park.id, goalId: null, title: "멘토링 세션 준비", done: true },
  ];

  const todos = await Promise.all(
    todosData.map((data) =>
      prisma.todo.create({
        data: {
          teamId: TEAM_ID,
          userId: data.userId,
          goalId: data.goalId,
          title: data.title,
          done: data.done,
          linkUrl: data.done ? "https://example.com/reference" : null,
        },
      })
    )
  );
  console.log(`  ✓ Todos ${todos.length}개 생성`);

  // ─── 4. Notes ───

  const notesData = [
    {
      todoIndex: 0, // JSX 문법 정리
      title: "JSX 핵심 문법 노트",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "JSX는 JavaScript XML의 약자로, React에서 UI를 표현하는 문법이다. 중괄호 {}를 사용하여 JavaScript 표현식을 삽입할 수 있다.",
              },
            ],
          },
        ],
      },
      linkUrl: "https://react.dev/learn/writing-markup-with-jsx",
    },
    {
      todoIndex: 1, // useState, useEffect
      title: "useState & useEffect 정리",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "useState: 상태 변수를 선언하고, 그 값을 업데이트할 수 있는 함수를 반환. useEffect: 컴포넌트가 렌더링될 때마다 특정 작업을 수행하도록 설정.",
              },
            ],
          },
        ],
      },
      linkUrl: "https://react.dev/reference/react/useState",
    },
    {
      todoIndex: 5, // 제네릭 타입 연습
      title: "TypeScript 제네릭 핵심 정리",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "제네릭은 타입을 파라미터로 받아 재사용 가능한 컴포넌트를 만드는 기법. Array<T>, Promise<T> 등이 대표적인 예시.",
              },
            ],
          },
        ],
      },
      linkUrl: null,
    },
    {
      todoIndex: 9, // 디자인 시안 확정
      title: "포트폴리오 디자인 방향 정리",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "미니멀한 디자인으로 결정. 메인 컬러 #2563EB, 서브 컬러 #64748B. 모바일 퍼스트로 진행.",
              },
            ],
          },
        ],
      },
      linkUrl: null,
    },
    {
      todoIndex: 16, // 오토레이아웃 심화 학습
      title: "Figma 오토레이아웃 팁",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Wrap으로 반응형 레이아웃 구현 가능. Min/Max width 활용하면 브레이크포인트 없이도 유연한 디자인 가능.",
              },
            ],
          },
        ],
      },
      linkUrl: "https://help.figma.com/hc/en-us/articles/360040451373",
    },
    {
      todoIndex: 20, // 컬러 팔레트 정의
      title: "디자인 시스템 컬러 팔레트",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Primary: Blue 600 (#2563EB), Secondary: Slate 500 (#64748B), Success: Green 500 (#22C55E), Error: Red 500 (#EF4444), Warning: Amber 500 (#F59E0B)",
              },
            ],
          },
        ],
      },
      linkUrl: null,
    },
    {
      todoIndex: 26, // 경쟁사 분석
      title: "경쟁사 분석 요약",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Todoist: 강력한 자연어 입력, 프로젝트 기반 관리. Notion: 올인원 워크스페이스, 커스텀 자유도 높음. TickTick: 습관 트래커 + 포모도로 통합.",
              },
            ],
          },
        ],
      },
      linkUrl: null,
    },
    {
      todoIndex: 31, // 인터뷰 질문지 작성
      title: "사용자 인터뷰 가이드",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "핵심 질문: 1) 현재 할 일 관리 방법은? 2) 가장 불편한 점은? 3) 목표 관리와 할 일 관리를 연결하는 것에 대한 생각은? 4) 팀 협업 시 공유 기능의 필요성은?",
              },
            ],
          },
        ],
      },
      linkUrl: null,
    },
  ];

  const notes = await Promise.all(
    notesData.map((data) => {
      const todo = todos[data.todoIndex];
      const original = todosData[data.todoIndex];
      return prisma.note.create({
        data: {
          teamId: TEAM_ID,
          userId: original.userId,
          todoId: todo.id,
          title: data.title,
          content: data.content,
          linkUrl: data.linkUrl,
        },
      });
    })
  );
  console.log(`  ✓ Notes ${notes.length}개 생성`);

  // ─── 5. Favorites ───

  const favoritePairs = [
    { userId: kim.id, todoIndex: 3 }, // React Router 실습
    { userId: kim.id, todoIndex: 6 }, // 유틸리티 타입 정리
    { userId: kim.id, todoIndex: 14 }, // 이력서 업데이트
    { userId: lee.id, todoIndex: 18 }, // 프로토타이핑 인터랙션
    { userId: lee.id, todoIndex: 22 }, // 버튼 컴포넌트 디자인
    { userId: park.id, todoIndex: 28 }, // 와이어프레임 초안
    { userId: park.id, todoIndex: 32 }, // 사용자 인터뷰 5명 진행
  ];

  const favorites = await Promise.all(
    favoritePairs.map((data) =>
      prisma.favorite.create({
        data: {
          teamId: TEAM_ID,
          userId: data.userId,
          todoId: todos[data.todoIndex].id,
        },
      })
    )
  );
  console.log(`  ✓ Favorites ${favorites.length}개 생성`);

  // ─── 6. Posts ───

  const posts = await Promise.all([
    prisma.post.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        title: "React 학습 후기 공유합니다",
        content:
          "이번 주 React 기초 과정을 마쳤습니다. JSX 문법과 Hook이 처음엔 낯설었는데, 직접 컴포넌트를 만들어보니 점점 익숙해지네요. 특히 useState와 useEffect의 조합이 강력하다는 걸 느꼈습니다. 다음 주부터 TypeScript와 함께 써볼 예정입니다!",
        viewCount: 24,
      },
    }),
    prisma.post.create({
      data: {
        teamId: TEAM_ID,
        userId: lee.id,
        title: "디자인 시스템 구축, 어떻게 시작하셨나요?",
        content:
          "안녕하세요! 디자인 시스템을 처음 구축해보려고 하는데, 컬러 팔레트랑 타이포그래피까지는 정했는데 컴포넌트를 어디서부터 만들어야 할지 감이 안 잡히네요. 혹시 경험 있으신 분 조언 부탁드립니다!",
        viewCount: 18,
      },
    }),
    prisma.post.create({
      data: {
        teamId: TEAM_ID,
        userId: park.id,
        title: "사용자 인터뷰 진행 팁 공유",
        content:
          "지난주 첫 사용자 인터뷰를 진행했는데, 몇 가지 팁을 공유합니다.\n\n1. 질문은 열린 질문으로 (예/아니오로 답할 수 없게)\n2. 침묵이 불편해도 기다리기 (사용자가 생각 정리할 시간)\n3. 녹음 동의 미리 받기\n4. 인터뷰 직후 메모 정리 필수\n\n다들 화이팅하세요!",
        viewCount: 31,
      },
    }),
    prisma.post.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        title: "TypeScript 제네릭, 이렇게 이해했습니다",
        content:
          "제네릭이 처음에 정말 어려웠는데, 함수의 매개변수처럼 타입을 전달한다고 생각하니까 이해가 됐습니다. Array<number>가 '숫자로 이루어진 배열' 타입이라고 읽으면 자연스럽더라고요. 직접 제네릭 함수를 만들어보는 게 제일 도움이 됐습니다.",
        viewCount: 15,
      },
    }),
    prisma.post.create({
      data: {
        teamId: TEAM_ID,
        userId: lee.id,
        title: "이번 주 목표 달성률 공유",
        content:
          "이번 주 목표는 Figma 오토레이아웃 마스터하기였는데, 60% 정도 달성한 것 같습니다. Wrap 기능이 생각보다 까다롭더라고요. 다음 주에 나머지 40%를 채워보겠습니다. 다들 이번 주 목표 달성률은 어떠세요?",
        viewCount: 12,
      },
    }),
  ]);
  console.log(`  ✓ Posts ${posts.length}개 생성`);

  // ─── 7. Comments ───

  const commentsData = [
    // Post 1: React 학습 후기
    {
      userId: lee.id,
      postIndex: 0,
      content: "저도 React 배우고 있는데 공감됩니다! Hook 처음 배울 때 진짜 헷갈리죠 ㅎㅎ",
    },
    {
      userId: park.id,
      postIndex: 0,
      content: "TypeScript랑 같이 쓰면 처음에 좀 더 어렵긴 한데, 타입 안정성이 확실히 좋아요!",
    },
    {
      userId: kim.id,
      postIndex: 0,
      content: "감사합니다! 다음에 TypeScript 후기도 올리겠습니다 👍",
    },

    // Post 2: 디자인 시스템 구축
    {
      userId: kim.id,
      postIndex: 1,
      content:
        "Atomic Design 방법론 참고해보시면 좋을 것 같아요. Atom → Molecule → Organism 순서로 올라가면 구조가 잡힙니다.",
    },
    {
      userId: park.id,
      postIndex: 1,
      content: "저도 궁금했던 내용이에요! 버튼이랑 인풋 같은 기본 컴포넌트부터 시작하는 게 좋다고 들었습니다.",
    },
    {
      userId: lee.id,
      postIndex: 1,
      content: "좋은 조언 감사합니다! Atomic Design 한번 찾아보겠습니다.",
    },

    // Post 3: 사용자 인터뷰 팁
    {
      userId: kim.id,
      postIndex: 2,
      content: "열린 질문 팁이 정말 유용하네요. 개발할 때도 사용자 관점이 중요하다는 걸 느낍니다.",
    },
    {
      userId: lee.id,
      postIndex: 2,
      content: "디자이너 입장에서도 사용자 인터뷰가 정말 중요한데, 좋은 팁 감사합니다!",
    },

    // Post 4: TypeScript 제네릭
    {
      userId: park.id,
      postIndex: 3,
      content: "비개발자인 저도 이해가 되는 설명이네요! 나중에 기획할 때 참고하겠습니다.",
    },
    {
      userId: lee.id,
      postIndex: 3,
      content: "함수 매개변수처럼 생각하는 비유가 좋네요. 저도 TypeScript 배워볼까 고민 중이에요.",
    },

    // Post 5: 목표 달성률
    {
      userId: kim.id,
      postIndex: 4,
      content: "저는 이번 주 React 목표 80% 정도 달성했어요! 다음 주도 화이팅!",
    },
    {
      userId: park.id,
      postIndex: 4,
      content: "기획서 작성 50% 정도... 와이어프레임이 아직 남았네요 ㅎㅎ 같이 힘내봐요!",
    },
  ];

  const comments = await Promise.all(
    commentsData.map((data) =>
      prisma.comment.create({
        data: {
          teamId: TEAM_ID,
          userId: data.userId,
          postId: posts[data.postIndex].id,
          content: data.content,
        },
      })
    )
  );
  console.log(`  ✓ Comments ${comments.length}개 생성`);

  // ─── 8. Notifications ───

  const notifications = await Promise.all([
    // Todo 완료 알림
    prisma.notification.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        type: "todo",
        message: "할 일 'JSX 문법 정리'을(를) 완료했습니다.",
        resourceId: todos[0].id,
      },
    }),
    prisma.notification.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        type: "todo",
        message: "할 일 'useState, useEffect 예제 만들기'을(를) 완료했습니다.",
        resourceId: todos[1].id,
      },
    }),
    prisma.notification.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        type: "todo",
        message: "할 일 '제네릭 타입 연습문제 풀기'을(를) 완료했습니다.",
        resourceId: todos[5].id,
      },
    }),

    // Goal 완료 알림 (포트폴리오 목표 - 전체 완료)
    prisma.notification.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        type: "goal",
        message: "목표 '포트폴리오 사이트 완성'의 모든 할 일을 완료했습니다.",
        resourceId: portfolioGoal.id,
      },
    }),

    // Comment 알림 (게시글 작성자에게)
    prisma.notification.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        type: "comment",
        message: "이디자인님이 'React 학습 후기 공유합니다' 게시글에 댓글을 남겼습니다.",
        resourceId: posts[0].id,
      },
    }),
    prisma.notification.create({
      data: {
        teamId: TEAM_ID,
        userId: lee.id,
        type: "comment",
        message: "김코딩님이 '디자인 시스템 구축, 어떻게 시작하셨나요?' 게시글에 댓글을 남겼습니다.",
        resourceId: posts[1].id,
      },
    }),
    prisma.notification.create({
      data: {
        teamId: TEAM_ID,
        userId: park.id,
        type: "comment",
        message: "김코딩님이 '사용자 인터뷰 진행 팁 공유' 게시글에 댓글을 남겼습니다.",
        resourceId: posts[2].id,
      },
    }),

    // 읽은 알림 몇 개
    prisma.notification.create({
      data: {
        teamId: TEAM_ID,
        userId: kim.id,
        type: "todo",
        message: "할 일 '디자인 시안 확정'을(를) 완료했습니다.",
        resourceId: todos[9].id,
        isRead: true,
      },
    }),
    prisma.notification.create({
      data: {
        teamId: TEAM_ID,
        userId: lee.id,
        type: "todo",
        message: "할 일 '오토레이아웃 심화 학습'을(를) 완료했습니다.",
        resourceId: todos[16].id,
        isRead: true,
      },
    }),
  ]);
  console.log(`  ✓ Notifications ${notifications.length}개 생성`);

  // ─── 완료 ───

  console.log("\n🌱 Seeding completed!\n");
  console.log("  📊 Summary:");
  console.log(`     Users:         ${users.length}`);
  console.log(`     Goals:         ${goals.length}`);
  console.log(`     Todos:         ${todos.length}`);
  console.log(`     Notes:         ${notes.length}`);
  console.log(`     Favorites:     ${favorites.length}`);
  console.log(`     Posts:         ${posts.length}`);
  console.log(`     Comments:      ${comments.length}`);
  console.log(`     Notifications: ${notifications.length}`);
  console.log(`\n  🔑 Test accounts (password: ${DEFAULT_PASSWORD}):`);
  console.log(`     김코딩: kim@example.com`);
  console.log(`     이디자인: lee@example.com`);
  console.log(`     박기획: park@example.com`);
  console.log(`     Team ID: ${TEAM_ID}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
