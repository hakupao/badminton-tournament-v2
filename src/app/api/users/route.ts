import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { normalizePassword, normalizeUsername, validatePassword, validateUsername } from "@/lib/account-validation";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

interface CreateUserRequestBody {
  username?: unknown;
  password?: unknown;
  role?: unknown;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const body = await request.json() as CreateUserRequestBody;
    const username = normalizeUsername(body.username);
    const password = normalizePassword(body.password);
    const role = body.role === "admin" || body.role === "athlete" ? body.role : undefined;

    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (body.role !== undefined && !role) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 });
    }

    // Check duplicate
    const existing = await db.select().from(users).where(eq(users.username, username)).get();
    if (existing) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    await db
      .insert(users)
      .values({
        username,
        passwordHash,
        role: role || "athlete",
      })
      .run();

    const newUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!newUser) {
      throw new Error("Failed to load the newly created user");
    }

    return NextResponse.json({
      user: { id: newUser.id, username: newUser.username, role: newUser.role },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
