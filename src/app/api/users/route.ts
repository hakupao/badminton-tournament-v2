import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        playerId: users.playerId,
      })
      .from(users)
      .all();

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const { username, password, role } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    if (role && !["admin", "athlete"].includes(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 });
    }

    // Check duplicate
    const existing = await db.select().from(users).where(eq(users.username, username)).get();
    if (existing) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        role: role || "athlete",
      })
      .returning()
      .get();

    return NextResponse.json({
      user: { id: newUser.id, username: newUser.username, role: newUser.role },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
