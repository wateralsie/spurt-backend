const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID ?? "CODEIT";

export class ApiResponseError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}/${TEAM_ID}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiResponseError(
      res.status,
      body.message ?? "요청에 실패했습니다.",
      body.code ?? "UNKNOWN_ERROR",
    );
  }

  return res.json() as Promise<T>;
}
