import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    const where = status ? { status } : {};

    const [conversations, total] = await Promise.all([
      prisma.whatsAppConversation.findMany({
        where,
        include: {
          lead: true,
          _count: { select: { messages: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, role: true, createdAt: true },
          },
        },
        orderBy: { lastMessageAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.whatsAppConversation.count({ where }),
    ]);

    return NextResponse.json({
      conversations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[CONVERSATIONS API] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
