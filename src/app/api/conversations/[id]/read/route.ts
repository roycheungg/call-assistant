import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel") || "whatsapp";

    if (channel === "website") {
      const updated = await prisma.websiteConversation.update({
        where: { id },
        data: { isRead: true },
        select: { id: true, isRead: true },
      });
      return NextResponse.json(updated);
    }

    const updated = await prisma.whatsAppConversation.update({
      where: { id },
      data: { isRead: true },
      select: { id: true, isRead: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[READ API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
