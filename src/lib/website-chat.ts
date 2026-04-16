interface LeadMarkerData {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
}

/**
 * Extract the [LEAD:{json}] marker from the AI response (if present)
 * and return the cleaned text without the marker.
 *
 * The AI is instructed to emit this marker at the end of a message
 * once it has captured the visitor's details.
 */
export function parseLeadMarker(text: string): {
  cleanText: string;
  lead: LeadMarkerData | null;
} {
  const match = text.match(/\[LEAD:(\{[^\]]+\})\]/);
  if (!match) return { cleanText: text, lead: null };

  try {
    const lead = JSON.parse(match[1]) as LeadMarkerData;
    const cleanText = text.replace(match[0], "").trim();
    return { cleanText, lead };
  } catch (err) {
    console.error("[WEBSITE CHAT] Failed to parse LEAD marker:", err);
    return { cleanText: text, lead: null };
  }
}

/**
 * Check whether an origin is in the allowed list.
 * Supports wildcards like "*.example.com" and the catch-all "*".
 */
export function checkCORS(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) return false;
  if (allowedOrigins.length === 0) return true; // no restriction
  if (allowedOrigins.includes("*")) return true;

  for (const pattern of allowedOrigins) {
    if (pattern === origin) return true;
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1);
      if (origin.endsWith(suffix)) return true;
    }
  }
  return false;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
