import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireTenant,
  requireSuperAdmin,
  isErrorResponse,
} from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const ctx = await requireTenant(req);
  if (isErrorResponse(ctx)) return ctx;

  try {
    const sites = await prisma.websiteConfig.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { conversations: true } },
      },
    });
    return NextResponse.json({ sites });
  } catch (error) {
    console.error("[WEBSITES API] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Only super-admins can create new websites — they pick which org it belongs to.
  const ctx = await requireSuperAdmin();
  if (isErrorResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const {
      organizationId,
      siteId,
      name,
      botName,
      systemPrompt,
      greeting,
      quickReplies,
      brandColor,
      allowedOrigins,
    } = body;

    if (!organizationId || !siteId || !name || !systemPrompt) {
      return NextResponse.json(
        { error: "organizationId, siteId, name, systemPrompt required" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(siteId)) {
      return NextResponse.json(
        { error: "siteId must be lowercase alphanumeric with dashes" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json(
        { error: "organization not found" },
        { status: 404 }
      );
    }

    const site = await prisma.websiteConfig.create({
      data: {
        organizationId,
        siteId,
        name,
        botName: botName || "Assistant",
        systemPrompt,
        greeting: greeting || null,
        quickReplies: quickReplies || [],
        brandColor: brandColor || "#2563eb",
        allowedOrigins: allowedOrigins || [],
      },
    });

    return NextResponse.json(site);
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "siteId already exists" },
        { status: 409 }
      );
    }
    console.error("[WEBSITES API] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
