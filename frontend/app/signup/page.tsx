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

interface SignupState {
  error: string;
  fieldErrors: {
    name?: string;
    email?: string;
    password?: string;
    passwordConfirm?: string;
  };
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

const initialState: SignupState = { error: "", fieldErrors: {} };

export default function SignupPage() {
  const router = useRouter();

  async function signupAction(
    _prev: SignupState,
    formData: FormData,
  ): Promise<SignupState> {
    const name = (formData.get("name") as string).trim();
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;
    const passwordConfirm = formData.get("passwordConfirm") as string;

    const fieldErrors: SignupState["fieldErrors"] = {};

    if (!name) fieldErrors.name = "이름을 입력해주세요.";
    if (!email) fieldErrors.email = "이메일을 입력해주세요.";
    if (password.length < 8)
      fieldErrors.password = "비밀번호는 8자 이상이어야 합니다.";
    if (password !== passwordConfirm)
      fieldErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";

    if (Object.keys(fieldErrors).length > 0) {
      return { error: "", fieldErrors };
    }

    try {
      const data = await api<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, name, password }),
      });

      setTokens(data.accessToken, data.refreshToken);
      router.push("/dashboard");
      return initialState;
    } catch (err) {
      if (err instanceof ApiResponseError) {
        if (err.code === "DUPLICATE_EMAIL") {
          return {
            error: "",
            fieldErrors: { email: "이미 사용 중인 이메일입니다." },
          };
        }
        return { error: err.message, fieldErrors: {} };
      }
      return {
        error: "회원가입에 실패했습니다. 다시 시도해주세요.",
        fieldErrors: {},
      };
    }
  }

  const [state, action, pending] = useActionState(signupAction, initialState);

  return (
    <AuthLayout>
      <form action={action} className="flex flex-col gap-4">
        <Input
          id="name"
          name="name"
          label="이름"
          placeholder="이름을 입력해주세요"
          autoComplete="name"
          required
          error={state.fieldErrors.name}
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="이메일"
          placeholder="이메일을 입력해주세요"
          autoComplete="email"
          required
          error={state.fieldErrors.email}
        />
        <PasswordInput
          id="password"
          name="password"
          label="비밀번호"
          placeholder="8자 이상 입력해주세요"
          autoComplete="new-password"
          required
          error={state.fieldErrors.password}
        />
        <PasswordInput
          id="passwordConfirm"
          name="passwordConfirm"
          label="비밀번호 확인"
          placeholder="비밀번호를 다시 입력해주세요"
          autoComplete="new-password"
          required
          error={state.fieldErrors.passwordConfirm}
        />

        {state.error && (
          <p className="text-center text-sm text-red-500">{state.error}</p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "회원가입 중..." : "회원가입"}
        </Button>
      </form>

      <div className="mt-6">
        <OAuthButtons />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        이미 회원이신가요?{" "}
        <Link href="/login" className="font-semibold text-orange-500 hover:underline">
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
}
