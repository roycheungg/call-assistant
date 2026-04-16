import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const site = await prisma.websiteConfig.findUnique({
      where: { id },
      include: {
        _count: { select: { conversations: true } },
      },
    });
    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(site);
  } catch (error) {
    console.error("[WEBSITE API] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Only allow updating specific fields - not siteId
    const updateData: Record<string, unknown> = {};
    const allowed = [
      "name",
      "botName",
      "systemPrompt",
      "greeting",
      "quickReplies",
      "brandColor",
      "allowedOrigins",
      "enabled",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }

    const site = await prisma.websiteConfig.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(site);
  } catch (error) {
    console.error("[WEBSITE API] PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.websiteConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WEBSITE API] DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
