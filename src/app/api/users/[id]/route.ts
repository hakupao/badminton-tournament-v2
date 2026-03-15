import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = getDb();
    const { password } = await request.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "密码不能为空" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!existing) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const passwordHash = await hashPassword(password);
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId))
      .run();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const admin = await requireAdmin();
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Prevent deleting yourself
    if (admin.id === userId) {
      return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!existing) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    await db.delete(users).where(eq(users.id, userId)).run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
