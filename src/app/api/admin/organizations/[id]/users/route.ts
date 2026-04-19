import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, isErrorResponse } from "@/lib/tenant";
import { hashPassword, validatePassword } from "@/lib/password";
import { parsePagination } from "@/lib/pagination";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSuperAdmin();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const { id: organizationId } = await params;
    const { take, skip } = parsePagination(new URL(req.url).searchParams);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.user.count({ where: { organizationId } }),
    ]);
    return NextResponse.json({ users, total, limit: take, offset: skip });
  } catch (error) {
    console.error("[ADMIN USERS] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSuperAdmin();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const { id: organizationId } = await params;
    const body = await req.json();
    const { email, name, role, password } = body;

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // If user exists, reassign to this org. Only set password if they don't already have one.
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      const updateData: Record<string, unknown> = {
        organizationId,
        name: existing.name || name || null,
        role: role || existing.role,
      };
      if (password && !existing.passwordHash) {
        const err = validatePassword(password);
        if (err) return NextResponse.json({ error: err }, { status: 400 });
        updateData.passwordHash = await hashPassword(password);
      }
      const updated = await prisma.user.update({
        where: { email: normalizedEmail },
        data: updateData,
      });
      return NextResponse.json(updated);
    }

    // New user — password required
    if (!password) {
      return NextResponse.json(
        { error: "password is required for new users" },
        { status: 400 }
      );
    }
    const err = validatePassword(password);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        organizationId,
        role: role || "member",
        passwordHash,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("[ADMIN USERS] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
