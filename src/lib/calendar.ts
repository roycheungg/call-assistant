/**
 * Calendar integration for booking callbacks.
 *
 * Uses Cal.com v2 API when the caller's organization has
 * `calComApiKey` + `calComEventTypeId` configured (via super-admin admin
 * UI). Falls back to a deterministic stub (local-only eventId) so dev/test
 * and orgs without a Cal.com account still work.
 *
 * Cal.com v2 docs: https://cal.com/docs/api-reference
 *
 * Behaviour contract:
 * - `bookCallback` never throws — always returns a BookingResult. On
 *   Cal.com errors it logs the error, returns `success:true` with a null
 *   eventId and a `warning` string so the caller can still persist the
 *   local callback row without losing the lead.
 * - `getAvailableSlots` returns the stub when no Cal.com config is present
 *   (preserves existing voice-agent "here are some times" behaviour).
 */

import { prisma } from "@/lib/prisma";

const CAL_API_BASE = "https://api.cal.com/v2";

export interface TimeSlot {
  start: string; // ISO datetime
  end: string;
  available: boolean;
}

export interface BookingResult {
  success: boolean;
  eventId?: string | null;
  scheduledAt?: string;
  error?: string;
  /** Set when we fell back because Cal.com was configured but failed. */
  warning?: string;
}

interface OrgCalCreds {
  apiKey: string;
  eventTypeId: string;
}

async function getOrgCalCreds(
  organizationId?: string
): Promise<OrgCalCreds | null> {
  if (!organizationId) return null;
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId },
    select: { calComApiKey: true, calComEventTypeId: true },
  });
  if (!settings?.calComApiKey || !settings.calComEventTypeId) return null;
  return {
    apiKey: settings.calComApiKey,
    eventTypeId: settings.calComEventTypeId,
  };
}

function stubSlots(date: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const baseDate = new Date(date);
  for (let hour = 9; hour < 17; hour++) {
    for (const minute of [0, 30]) {
      const start = new Date(baseDate);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 30);
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        available: true,
      });
    }
  }
  return slots;
}

/**
 * Return available time slots for a given date.
 * Cal.com path when creds present; deterministic 30-min stub otherwise.
 */
export async function getAvailableSlots(
  date: string,
  _teamMember?: string,
  organizationId?: string
): Promise<TimeSlot[]> {
  const creds = await getOrgCalCreds(organizationId);
  if (!creds) return stubSlots(date);

  try {
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(23, 59, 59, 999);

    const url = new URL(`${CAL_API_BASE}/slots`);
    url.searchParams.set("eventTypeId", creds.eventTypeId);
    url.searchParams.set("startTime", startTime.toISOString());
    url.searchParams.set("endTime", endTime.toISOString());

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${creds.apiKey}` },
    });
    if (!res.ok) {
      console.error(
        `[CALENDAR] Cal.com /slots failed (${res.status}), falling back to stub`
      );
      return stubSlots(date);
    }
    const data = (await res.json()) as {
      data?: Record<string, Array<{ time: string }>>;
    };

    // Cal.com returns `{ data: { "YYYY-MM-DD": [{ time: ISO }, ...] } }`
    const slots: TimeSlot[] = [];
    for (const [, dailySlots] of Object.entries(data.data || {})) {
      for (const s of dailySlots) {
        const start = new Date(s.time);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 30);
        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          available: true,
        });
      }
    }
    return slots;
  } catch (err) {
    console.error("[CALENDAR] Cal.com /slots threw, falling back:", err);
    return stubSlots(date);
  }
}

/**
 * Book a callback. Arguments kept positional for backwards-compat with the
 * existing Vapi functions call-site; `organizationId` appended on the end.
 *
 * Returns `success:true` even when Cal.com fails so the caller still
 * persists the local Callback row. See `warning` on the result for details.
 */
export async function bookCallback(
  scheduledAt: string,
  leadName: string,
  leadPhone: string,
  assignedTo: string,
  notes?: string,
  leadEmail?: string | null,
  organizationId?: string
): Promise<BookingResult> {
  const creds = await getOrgCalCreds(organizationId);

  // No Cal.com configured → local-only booking, same behaviour as before.
  if (!creds) {
    return {
      success: true,
      eventId: `evt_${Date.now()}`,
      scheduledAt,
    };
  }

  // Cal.com requires an attendee email. Without one we can't book.
  if (!leadEmail) {
    return {
      success: true,
      eventId: null,
      scheduledAt,
      warning:
        "Cal.com skipped: lead has no email on file (required by Cal.com).",
    };
  }

  try {
    const res = await fetch(`${CAL_API_BASE}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: scheduledAt,
        eventTypeId: Number(creds.eventTypeId),
        attendee: {
          name: leadName,
          email: leadEmail,
          timeZone: "Europe/London",
          language: "en",
          phoneNumber: leadPhone,
        },
        metadata: {
          assignedTo,
          notes: notes || "",
          source: "call-assistant",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[CALENDAR] Cal.com /bookings failed (${res.status}): ${text.slice(0, 300)}`
      );
      return {
        success: true,
        eventId: null,
        scheduledAt,
        warning: `Cal.com booking failed (${res.status}). Local callback created.`,
      };
    }

    const data = (await res.json()) as {
      data?: { uid?: string; id?: number | string };
    };
    const eventId =
      data.data?.uid ||
      (data.data?.id !== undefined ? String(data.data.id) : null);

    return {
      success: true,
      eventId: eventId || null,
      scheduledAt,
    };
  } catch (err) {
    console.error("[CALENDAR] Cal.com /bookings threw:", err);
    return {
      success: true,
      eventId: null,
      scheduledAt,
      warning: "Cal.com request threw. Local callback created.",
    };
  }
}
