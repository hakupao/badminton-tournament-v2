import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = 'edge';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        playerId: user.playerId,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
