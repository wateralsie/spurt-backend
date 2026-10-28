"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  initGoogle,
  requestGoogleToken,
  getKakaoAuthUrl,
  oauthLogin,
} from "@/lib/oauth";
import { ApiResponseError } from "@/lib/api";

export default function OAuthButtons() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"google" | null>(null);
  const googleClient =
    useRef<google.accounts.oauth2.TokenClient | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof google !== "undefined") {
        initGoogle().then((client) => {
          googleClient.current = client;
        });
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  async function handleGoogle() {
    if (!googleClient.current || loading) return;
    setError("");
    setLoading("google");
    try {
      const token = await requestGoogleToken(googleClient.current);
      await oauthLogin("google", token);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiResponseError) {
        if (err.code === "DUPLICATE_EMAIL") {
          setError("이미 다른 방법으로 가입된 이메일입니다.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Google 로그인에 실패했습니다.");
      }
    } finally {
      setLoading(null);
    }
  }

  function handleKakao() {
    window.location.href = getKakaoAuthUrl();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">또는</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading !== null}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
            fill="#EA4335"
          />
        </svg>
        {loading === "google" ? "로그인 중..." : "Google로 시작하기"}
      </button>

      <button
        type="button"
        onClick={handleKakao}
        disabled={loading !== null}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-medium text-[#191919] transition-colors hover:bg-[#FDD800] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            d="M9 1C4.582 1 1 3.87 1 7.404c0 2.282 1.506 4.29 3.78 5.427l-.963 3.556c-.084.312.272.56.546.383l4.253-2.836c.126.009.253.013.384.013 4.418 0 8-2.87 8-6.543C17 3.87 13.418 1 9 1Z"
            fill="#191919"
          />
        </svg>
        카카오로 시작하기
      </button>

      {error && (
        <p className="text-center text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
