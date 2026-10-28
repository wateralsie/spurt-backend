import { z } from "zod";

export const UserSchema = z.object({
  id: z.number(),
  teamId: z.string(),
  email: z.string().describe("이메일 주소 (변경 불가)"),
  name: z.string().describe("사용자 이름 (1-20자)"),
  image: z.string().nullable().describe("프로필 이미지 URL (null로 보내면 이미지 제거)"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const ChangePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").describe("현재 비밀번호"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .describe("새 비밀번호 (8-72자)"),
});

export const UpdateUserBodySchema = z
  .object({
    name: z.string().min(1).max(20).optional().describe("사용자 이름 (1-20자)"),
    image: z.url().nullable().optional().describe("프로필 이미지 URL (null로 보내면 이미지 제거)"),
  })
  .refine((data) => data.name !== undefined || data.image !== undefined, {
    message: "At least one field (name or image) is required",
  });
