"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/auth/PasswordInput";
import Button from "@/components/ui/Button";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { api, ApiResponseError } from "@/lib/api";
import { setTokens } from "@/lib/auth";

interface LoginState {
  error: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export default function LoginPage() {
  const router = useRouter();

  async function loginAction(
    _prev: LoginState,
    formData: FormData,
  ): Promise<LoginState> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "이메일과 비밀번호를 입력해주세요." };
    }

    try {
      const data = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setTokens(data.accessToken, data.refreshToken);
      router.push("/dashboard");
      return { error: "" };
    } catch (err) {
      if (err instanceof ApiResponseError) {
        if (err.code === "INVALID_CREDENTIALS") {
          return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
        }
        return { error: err.message };
      }
      return { error: "로그인에 실패했습니다. 다시 시도해주세요." };
    }
  }

  const [state, action, pending] = useActionState(loginAction, { error: "" });

  return (
    <AuthLayout>
      <form action={action} className="flex flex-col gap-4">
        <Input
          name="email"
          type="email"
          placeholder="이메일"
          autoComplete="email"
          required
        />
        <PasswordInput
          name="password"
          placeholder="비밀번호"
          autoComplete="current-password"
          required
        />

        {state.error && (
          <p className="text-center text-sm text-red-500">{state.error}</p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <div className="mt-6">
        <OAuthButtons />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        슬리드투두가 처음이신가요?{" "}
        <Link href="/signup" className="font-semibold text-orange-500 hover:underline">
          회원가입
        </Link>
      </p>
    </AuthLayout>
  );
}
