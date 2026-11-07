import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, createSessionToken, hashPassword, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const trimmedUser = username.trim().toLowerCase();

    // Check if any users exist in the database
    const userCount = await db.user.count();

    if (userCount === 0) {
      // First-time setup: automatically initialize the primary admin account
      const passwordHash = await hashPassword(password);
      const adminUser = await db.user.create({
        data: {
          username: trimmedUser,
          displayName: username.trim(),
          passwordHash,
          role: "admin",
        },
      });

      const token = await createSessionToken({
        userId: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
      });

      const response = NextResponse.json({
        success: true,
        message: "Initial admin account created successfully",
        user: {
          id: adminUser.id,
          username: adminUser.username,
          displayName: adminUser.displayName,
          role: adminUser.role,
        },
      });

      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return response;
    }

    // Existing user authentication
    const user = await db.user.findUnique({
      where: { username: trimmedUser },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

