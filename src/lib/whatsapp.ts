import { createHmac } from "crypto";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

export async function sendTextMessage(
  to: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const truncatedBody =
    body.length > 4096 ? body.slice(0, 4093) + "..." : body;

  const url = `${GRAPH_API_BASE}/${PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: truncatedBody },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[WHATSAPP] Send message failed:", res.status, text);
    return { success: false, error: `WhatsApp API error ${res.status}: ${text}` };
  }

  const data = await res.json();
  return { success: true, messageId: data.messages?.[0]?.id };
}

export async function markAsRead(messageId: string): Promise<void> {
  const url = `${GRAPH_API_BASE}/${PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  }).catch((err) => console.error("[WHATSAPP] Mark-as-read failed:", err));
}

export function verifySignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!APP_SECRET) return true;
  if (!signatureHeader) return false;

  const expectedSig = signatureHeader.replace("sha256=", "");
  const computedSig = createHmac("sha256", APP_SECRET)
    .update(rawBody)
    .digest("hex");
  return expectedSig === computedSig;
}

export function waIdToPhone(waId: string): string {
  return waId.startsWith("+") ? waId : `+${waId}`;
}
