import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "child_process";
import { prisma } from "@/lib/prisma";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface LeadExtractionTarget {
  /** Lead row id to upsert extracted details onto. */
  leadId: string;
}

interface ChatOptions {
  organizationId?: string;
  allowCLI?: boolean;
  /**
   * When set, the Claude API call adds a `save_customer_details` tool.
   * If Claude decides to call it (the customer has shared name / email /
   * company / a description of what they need), we upsert those fields
   * onto the named lead. The CLI fallback ignores this — it has no
   * tool-use support.
   */
  extractToLead?: LeadExtractionTarget;
}

/**
 * Anthropic tool definition. Mirrors the shape of Vapi's existing
 * save_customer_details function so all channels populate Lead fields
 * consistently.
 */
const SAVE_CUSTOMER_DETAILS_TOOL = {
  name: "save_customer_details",
  description:
    "Save NEW information the customer has shared in this conversation. " +
    "Call this only when you've actually learned something specific the " +
    "team would want to follow up on (their name, email, company, or a " +
    "summary of what they need help with). Do NOT call it for casual " +
    "chitchat or when nothing new was shared since the previous turn.",
  input_schema: {
    type: "object" as const,
    properties: {
      issue: {
        type: "string",
        description:
          "Short one-sentence summary of what the customer wants or needs.",
      },
      name: { type: "string", description: "Customer's name if mentioned." },
      email: { type: "string", description: "Email address if shared." },
      company: { type: "string", description: "Company name if mentioned." },
    },
  },
};

const TOOL_INSTRUCTION =
  "\n\nIMPORTANT: When the customer shares their name, email, company, " +
  "or describes what they need help with, call the `save_customer_details` " +
  "tool with the new info. Only call it when you've genuinely learned " +
  "something — don't call it on every message.";

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface TextBlock {
  type: "text";
  text: string;
}

type ContentBlock = ToolUseBlock | TextBlock | { type: string };

/**
 * Apply customer details extracted by Claude to the lead row. Truncates
 * each field to a sensible length. Failures are logged and swallowed —
 * never blocks the user reply.
 */
async function applyCustomerDetails(
  leadId: string,
  details: {
    issue?: string;
    name?: string;
    email?: string;
    company?: string;
  }
): Promise<void> {
  const data: Record<string, string> = {};
  if (typeof details.issue === "string" && details.issue.trim()) {
    data.issue = details.issue.trim().slice(0, 500);
  }
  if (typeof details.name === "string" && details.name.trim()) {
    data.name = details.name.trim().slice(0, 200);
  }
  if (typeof details.email === "string" && details.email.trim()) {
    data.email = details.email.trim().slice(0, 200);
  }
  if (typeof details.company === "string" && details.company.trim()) {
    data.company = details.company.trim().slice(0, 200);
  }
  if (Object.keys(data).length === 0) return;

  try {
    await prisma.lead.update({ where: { id: leadId }, data });
    console.log(
      `[CLAUDE] Lead ${leadId} updated via save_customer_details:`,
      Object.keys(data).join(", ")
    );
  } catch (err) {
    console.error("[CLAUDE] Lead update failed:", err);
  }
}

export type MessagingChannel = "whatsapp" | "instagram" | "facebook";

const CHANNEL_LABEL: Record<MessagingChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook Messenger",
};

/**
 * Build a system prompt for an org's messaging channel.
 *
 * Super-admins set per-channel prompts (`<channel>SystemPrompt`) on the
 * OrganizationSettings via the admin UI. If unset, we fall back to a
 * generic prompt that mentions the business name and the channel.
 *
 * Defaults to "whatsapp" for backwards-compat with existing callsites.
 */
export async function buildSystemPrompt(
  organizationId: string,
  channel: MessagingChannel = "whatsapp"
): Promise<string> {
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId },
  });

  const customPrompt =
    channel === "whatsapp"
      ? settings?.whatsappSystemPrompt
      : channel === "instagram"
      ? settings?.instagramSystemPrompt
      : settings?.facebookSystemPrompt;

  if (customPrompt) return customPrompt;

  const businessName = settings?.businessName || "Our Business";
  const label = CHANNEL_LABEL[channel];

  return `You are a helpful ${label} assistant for ${businessName}.

Guidelines:
- Be friendly, professional, and concise (${label} messages should be brief).
- Answer what you can. If you can't, say so honestly — don't make up information
  about pricing, availability, or services.
- If someone needs to speak to a person, let them know the team will follow up.
- Keep responses under 500 words.`;
}

// --- Claude Code CLI method (Max plan, local testing only) ---

function formatPromptForCLI(
  messages: ChatMessage[],
  systemPrompt: string
): string {
  const recentMessages = messages.slice(-30);
  const conversation = recentMessages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return `${systemPrompt}

Conversation so far:
${conversation}

Respond to the last user message as the assistant. Be concise — this is a WhatsApp message.`;
}

async function getChatResponseCLI(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const prompt = formatPromptForCLI(messages, systemPrompt);

  // On Windows, execFile doesn't resolve .exe/.cmd via PATHEXT unless shell is used.
  // Pass the explicit extension so the binary is found on both platforms.
  const binary = process.platform === "win32" ? "claude.exe" : "claude";

  return new Promise((resolve) => {
    execFile(
      binary,
      ["-p", "--output-format", "text", prompt],
      { timeout: 60_000, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          console.error("[CLAUDE CLI] Error:", error.message);
          if (stderr) console.error("[CLAUDE CLI] Stderr:", stderr);
          resolve(
            "Sorry, I was unable to generate a response right now. Please try again."
          );
          return;
        }
        const response = stdout.trim();
        resolve(response || "Sorry, I was unable to generate a response.");
      }
    );
  });
}

// --- Anthropic API method (production) ---

async function getChatResponseAPI(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
  extractToLead?: LeadExtractionTarget
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const recentMessages = messages.slice(-30);
  const enableTools = Boolean(extractToLead);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseRequest: any = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: enableTools ? systemPrompt + TOOL_INSTRUCTION : systemPrompt,
    messages: recentMessages,
  };
  if (enableTools) baseRequest.tools = [SAVE_CUSTOMER_DETAILS_TOOL];

  const first = await anthropic.messages.create(baseRequest);
  const firstContent = first.content as ContentBlock[];

  // Process any tool calls from this turn. Claude may emit text + tool_use
  // in one response, or stop_reason="tool_use" expecting tool_results.
  const toolUses = firstContent.filter(
    (b): b is ToolUseBlock => b.type === "tool_use"
  );
  if (extractToLead && toolUses.length > 0) {
    for (const block of toolUses) {
      if (block.name === "save_customer_details") {
        await applyCustomerDetails(
          extractToLead.leadId,
          block.input as {
            issue?: string;
            name?: string;
            email?: string;
            company?: string;
          }
        );
      }
    }
  }

  // If Claude stopped to use a tool, it hasn't produced final text yet.
  // Send the tool_results back so it can finish its reply.
  if (first.stop_reason === "tool_use" && extractToLead) {
    const toolResults = toolUses.map((b) => ({
      type: "tool_result" as const,
      tool_use_id: b.id,
      content: "Saved.",
    }));

    const followUp = await anthropic.messages.create({
      ...baseRequest,
      messages: [
        ...recentMessages,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { role: "assistant", content: first.content as any },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { role: "user", content: toolResults as any },
      ],
    });

    const followText = (followUp.content as ContentBlock[]).find(
      (b): b is TextBlock => b.type === "text"
    );
    return followText?.text || "Sorry, I was unable to generate a response.";
  }

  const textBlock = firstContent.find(
    (b): b is TextBlock => b.type === "text"
  );
  return textBlock?.text || "Sorry, I was unable to generate a response.";
}

// --- Public entry point: routes between API and CLI based on org config ---

export async function getChatResponse(
  messages: ChatMessage[],
  systemPrompt: string,
  options?: ChatOptions
): Promise<string> {
  // Per-org API key override (for enterprise clients)
  if (options?.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: options.organizationId },
      select: { anthropicApiKeyOverride: true, slug: true },
    });

    if (org?.anthropicApiKeyOverride) {
      return getChatResponseAPI(
        messages,
        systemPrompt,
        org.anthropicApiKeyOverride,
        options.extractToLead
      );
    }

    // Claude CLI fallback - only allowed for the DOAI org and only if no shared key is set
    if (
      options.allowCLI &&
      org?.slug === "doai" &&
      !process.env.ANTHROPIC_API_KEY
    ) {
      // CLI path doesn't support tool use; lead extraction is silently
      // skipped. Acceptable: CLI is dev-only / Max-plan local testing.
      return getChatResponseCLI(messages, systemPrompt);
    }
  }

  // Default: use the shared Anthropic API key
  if (process.env.ANTHROPIC_API_KEY) {
    return getChatResponseAPI(
      messages,
      systemPrompt,
      process.env.ANTHROPIC_API_KEY,
      options?.extractToLead
    );
  }

  // Last-resort fallback
  if (options?.allowCLI) {
    return getChatResponseCLI(messages, systemPrompt);
  }

  return "Sorry, the AI service isn't configured yet. Please contact support.";
}
