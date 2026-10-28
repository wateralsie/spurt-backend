import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";

const userSelect = {
  id: true,
  teamId: true,
  email: true,
  name: true,
  image: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getMe(teamId: string, userId: number) {
  const user = await prisma.user.findFirst({
    where: { id: userId, teamId },
    select: userSelect,
  });
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }
  return user;
}

export async function updateMe(
  teamId: string,
  userId: number,
  data: { name?: string; image?: string | null },
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, teamId },
  });
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }
  return prisma.user.update({
    where: { id: userId },
    data,
    select: userSelect,
  });
}

export async function changePassword(
  teamId: string,
  userId: number,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, teamId },
  });
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }
  if (user.provider !== "email" || !user.password) {
    throw new ApiError(400, "OAuth accounts cannot change password", "OAUTH_ACCOUNT");
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw new ApiError(401, "Current password is incorrect", "INVALID_CREDENTIALS");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

export async function checkNickname(teamId: string, name: string) {
  const user = await prisma.user.findFirst({
    where: { teamId, name },
  });
  return { available: !user };
}

export async function deleteMe(teamId: string, userId: number) {
  const user = await prisma.user.findFirst({
    where: { id: userId, teamId },
  });
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }
  await prisma.user.delete({ where: { id: userId } });
}
