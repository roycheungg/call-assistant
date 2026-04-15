import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function buildSystemPrompt(): Promise<string> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
  });

  if (settings?.whatsappSystemPrompt) {
    return settings.whatsappSystemPrompt;
  }

  const businessName = settings?.businessName || "Our Business";
  const description = settings?.businessDescription || "";
  const services =
    (settings?.services as Array<{ name: string; description: string }>) || [];
  const hours = settings?.operatingHours as {
    start: string;
    end: string;
    days: number[];
  } | null;

  const serviceList =
    services.length > 0
      ? services.map((s) => `- ${s.name}: ${s.description}`).join("\n")
      : "General business inquiries";

  const hoursText =
    hours?.start && hours?.end
      ? `${hours.start} to ${hours.end}`
      : "Standard business hours";

  return `You are a helpful WhatsApp assistant for ${businessName}.
${description ? `\nAbout the business: ${description}` : ""}

Services offered:
${serviceList}

Operating hours: ${hoursText}

Guidelines:
- Be friendly, professional, and concise (WhatsApp messages should be brief)
- Help answer questions about the business and its services
- If someone needs to speak to a person, let them know the team will follow up
- If you cannot answer a question, say so honestly
- Do not make up information about pricing or availability unless specified above
- Keep responses under 500 words as these are WhatsApp messages`;
}

export async function getChatResponse(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const recentMessages = messages.slice(-30);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: recentMessages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text || "Sorry, I was unable to generate a response.";
}
