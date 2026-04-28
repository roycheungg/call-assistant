import { prisma } from "@/lib/prisma";

/**
 * The four messaging channels surfaced on the conversations page.
 *
 * Voice ("phone") doesn't show in the conversations tab and is excluded
 * here on purpose — it has its own page.
 */
export type Channel = "whatsapp" | "website" | "instagram" | "facebook";

const FLAG_FIELD: Record<Channel, "whatsappEnabled" | "chatbotEnabled" | "instagramEnabled" | "facebookEnabled"> = {
  whatsapp: "whatsappEnabled",
  website: "chatbotEnabled",
  instagram: "instagramEnabled",
  facebook: "facebookEnabled",
};

/**
 * Resolve whether a channel is enabled for an organization.
 *
 * Used by every conversation read/write endpoint so that a tenant who
 * disables a channel can't be probed via direct URLs (commit `f8c1159`
 * gated the list endpoint; the detail/read/star endpoints inherit the
 * same gate via this helper).
 *
 * Returns false if the org has no settings row, mirroring the safe-by-
 * default behaviour of the list endpoint.
 */
export async function isChannelEnabled(
  organizationId: string,
  channel: Channel
): Promise<boolean> {
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId },
    select: {
      whatsappEnabled: true,
      chatbotEnabled: true,
      instagramEnabled: true,
      facebookEnabled: true,
    },
  });
  if (!settings) return false;
  return Boolean(settings[FLAG_FIELD[channel]]);
}
