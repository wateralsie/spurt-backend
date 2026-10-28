"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { clearTokens } from "@/lib/auth";

const NAV_ITEMS = ["대시보드", "목표"];

export default function DashboardPage() {
  const router = useRouter();

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-6">
          <Image src="/logo.svg" alt="Slid to-do" width={140} height={32} />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item, i) => (
            <div
              key={item}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                i === 0
                  ? "bg-orange-50 text-orange-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-10 py-8">
        <h1 className="mb-8 text-xl font-bold text-slate-900">
          님의 대시보드
        </h1>

        {/* Top cards */}
        <div className="mb-8 grid grid-cols-2 gap-6">
          {/* Recent todos */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              최근 등록 할일
            </h2>
            <div className="flex flex-col gap-3">
              {["할 일을 등록해보세요", "목표를 설정해보세요"].map((text) => (
                <div
                  key={text}
                  className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500"
                >
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 p-6 text-white">
            <div className="text-center">
              <p className="mb-2 text-sm opacity-80">내 진행 상황</p>
              <p className="text-5xl font-bold">0%</p>
            </div>
          </div>
        </div>

        {/* Goals section */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            목표 별 할일
          </h2>
          <p className="py-10 text-center text-sm text-slate-400">
            아직 등록된 목표가 없습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
