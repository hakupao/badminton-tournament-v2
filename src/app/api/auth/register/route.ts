import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, createToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const runtime = 'edge';

interface RegisterRequestBody {
  username?: unknown;
  password?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json() as RegisterRequestBody;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username.length < 2) {
      return NextResponse.json(
        { error: "Username must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    await db
      .insert(users)
      .values({
        username,
        passwordHash,
        role: "athlete",
      })
      .run();

    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!result) {
      throw new Error("Failed to load the newly created user");
    }

    const token = await createToken(result.id, result.role);

    const response = NextResponse.json({
      user: {
        id: result.id,
        username: result.username,
        role: result.role,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
