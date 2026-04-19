import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant, isErrorResponse } from "@/lib/tenant";
import { parsePagination } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const ctx = await requireTenant(req);
  if (isErrorResponse(ctx)) return ctx;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const { take, skip } = parsePagination(searchParams);

    const where: Record<string, unknown> = { organizationId: ctx.organizationId };
    if (status) where.status = status;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          _count: { select: { calls: true, callbacks: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({ leads, total, limit: take, offset: skip });
  } catch (error) {
    console.error("[LEADS API] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
