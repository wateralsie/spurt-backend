import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code, redirectUri } = await req.json();

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!,
    client_secret: process.env.KAKAO_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error_description ?? "토큰 교환 실패" },
      { status: res.status },
    );
  }

  return NextResponse.json({ access_token: data.access_token });
}
