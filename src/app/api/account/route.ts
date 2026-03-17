import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import {
  normalizePassword,
  normalizeUsername,
  validatePassword,
  validateUsername,
} from "@/lib/account-validation";

export const runtime = "edge";

interface UpdateAccountRequestBody {
  username?: unknown;
  currentPassword?: unknown;
  newPassword?: unknown;
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await requireUser();
    const body = await request.json() as UpdateAccountRequestBody;
    const username = normalizeUsername(body.username);
    const currentPassword = normalizePassword(body.currentPassword);
    const newPassword = normalizePassword(body.newPassword);

    const usernameChanged = Boolean(username) && username !== currentUser.username;
    const passwordChanged = Boolean(newPassword);

    if (!usernameChanged && !passwordChanged) {
      return NextResponse.json({ error: "没有需要保存的修改" }, { status: 400 });
    }

    const currentPasswordError = validatePassword(currentPassword, "当前密码");
    if (currentPasswordError) {
      return NextResponse.json({ error: currentPasswordError }, { status: 400 });
    }

    const passwordValid = await verifyPassword(currentPassword, currentUser.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
    }

    if (usernameChanged) {
      const usernameError = validateUsername(username);
      if (usernameError) {
        return NextResponse.json({ error: usernameError }, { status: 400 });
      }
    }

    if (passwordChanged) {
      const newPasswordError = validatePassword(newPassword, "新密码");
      if (newPasswordError) {
        return NextResponse.json({ error: newPasswordError }, { status: 400 });
      }
    }

    const db = getDb();

    if (usernameChanged) {
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .get();

      if (existingUser && existingUser.id !== currentUser.id) {
        return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
      }
    }

    const updates: { username?: string; passwordHash?: string } = {};
    if (usernameChanged) {
      updates.username = username;
    }
    if (passwordChanged) {
      updates.passwordHash = await hashPassword(newPassword);
    }

    await db.update(users).set(updates).where(eq(users.id, currentUser.id)).run();

    const updatedUser = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.id))
      .get();

    if (!updatedUser) {
      throw new Error("Failed to load updated user");
    }

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        playerId: updatedUser.playerId,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Update account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
