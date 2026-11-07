import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    // Check if initial setup is needed
    const userCount = await db.user.count();
    return NextResponse.json({
      authenticated: false,
      needsSetup: userCount === 0,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: session,
  });
}

