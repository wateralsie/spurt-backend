"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeKakaoCode, oauthLogin } from "@/lib/oauth";
import { ApiResponseError } from "@/lib/api";

function KakaoCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("인가 코드가 없습니다.");
      return;
    }

    (async () => {
      try {
        const accessToken = await exchangeKakaoCode(code);
        await oauthLogin("kakao", accessToken);
        router.replace("/dashboard");
      } catch (err) {
        if (err instanceof ApiResponseError && err.code === "DUPLICATE_EMAIL") {
          setError("이미 다른 방법으로 가입된 이메일입니다.");
        } else {
          setError("카카오 로그인에 실패했습니다. 다시 시도해주세요.");
        }
      }
    })();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="text-center">
        <p className="mb-4 text-sm text-red-500">{error}</p>
        <button
          onClick={() => router.push("/login")}
          className="text-sm font-medium text-orange-500 hover:underline"
        >
          로그인으로 돌아가기
        </button>
      </div>
    );
  }

  return <p className="text-sm text-slate-500">로그인 처리 중...</p>;
}

export default function KakaoCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Suspense
        fallback={<p className="text-sm text-slate-500">로그인 처리 중...</p>}
      >
        <KakaoCallback />
      </Suspense>
    </div>
  );
}
