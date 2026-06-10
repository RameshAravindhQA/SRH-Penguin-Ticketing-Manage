import { randomUUID } from "node:crypto";
import { q, qRaw, inList } from "@workspace/db";
import { logger } from "./logger";
import { getNotificationPreferences } from "./notificationPreferences";

type EntityType = "ticket" | "project" | "todo" | "note";

type GoogleAttendee = {
  email: string;
  displayName?: string;
};

type SyncInput = {
  localEventId?: number;
  title: string;
  description?: string | null;
  startDate: Date | string;
  endDate?: Date | string | null;
  type: string;
  entityType?: EntityType | string | null;
  entityId?: number | null;
  attendeeIds?: number[];
  createMeet?: boolean;
  sendUpdates?: "all" | "externalOnly" | "none";
};

type GoogleEventResult = {
  googleEventId: string | null;
  meetingLink: string | null;
  htmlLink: string | null;
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

function calendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

function isConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

function defaultDurationMinutes(): number {
  const value = Number(process.env.GOOGLE_DEFAULT_EVENT_DURATION_MINUTES ?? 30);
  return Number.isFinite(value) && value > 0 ? value : 30;
}

function timezone(): string {
  return process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Kolkata";
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function eventEnd(start: Date, end?: Date | string | null): Date {
  if (end) return toDate(end);
  return new Date(start.getTime() + defaultDurationMinutes() * 60_000);
}

function csv(ids: number[]): string | null {
  return ids.length ? ids.join(",") : null;
}

function normalizeAttendeeIds(ids?: number[]): number[] {
  return [...new Set((ids ?? []).map(Number).filter(Number.isFinite))];
}

export function isGoogleCalendarConfigured(): boolean {
  return isConfigured();
}

export async function getGoogleAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? "",
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token request failed (${response.status}): ${text}`);
  }

  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Google token response did not include access_token");
  return payload.access_token;
}

async function googleRequest<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getGoogleAccessToken();
  const response = await fetch(`${GOOGLE_CALENDAR_BASE}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar request failed (${response.status}): ${text}`);
  }

  return await response.json() as T;
}

async function attendeesForUserIds(userIds: number[]): Promise<GoogleAttendee[]> {
  const ids = normalizeAttendeeIds(userIds);
  if (!ids.length) return [];
  const users = await qRaw<{ id: number; name: string; email: string }>(
    `SELECT id, name, email FROM users WHERE id IN ${inList(ids)} AND email IS NOT NULL AND email <> ''`,
  );
  return users
    .filter(user => user.email)
    .map(user => ({ email: user.email, displayName: user.name }));
}

async function markSyncFailure(localEventId: number | undefined, error: unknown): Promise<void> {
  if (!localEventId) return;
  const message = error instanceof Error ? error.message : String(error);
  await qRaw(
    `UPDATE calendar_events
     SET google_sync_status = @status, google_sync_error = @error, google_synced_at = SYSDATETIMEOFFSET()
     WHERE id = @id`,
    { id: localEventId, status: "failed", error: message.slice(0, 1900) },
  );
}

function googlePayload(input: SyncInput, attendees: GoogleAttendee[]) {
  const start = toDate(input.startDate);
  const end = eventEnd(start, input.endDate);
  const payload: Record<string, unknown> = {
    summary: input.title,
    description: input.description ?? undefined,
    start: { dateTime: start.toISOString(), timeZone: timezone() },
    end: { dateTime: end.toISOString(), timeZone: timezone() },
    attendees,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 10 },
      ],
    },
    extendedProperties: {
      private: {
        srhEntityType: input.entityType ?? "",
        srhEntityId: input.entityId != null ? String(input.entityId) : "",
        srhLocalEventId: input.localEventId != null ? String(input.localEventId) : "",
      },
    },
  };

  if (input.createMeet) {
    payload.conferenceData = {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  return payload;
}

async function createGoogleEvent(input: SyncInput): Promise<GoogleEventResult> {
  const attendees = await attendeesForUserIds(input.attendeeIds ?? []);
  const query = new URLSearchParams({
    conferenceDataVersion: input.createMeet ? "1" : "0",
    sendUpdates: input.sendUpdates ?? "all",
  });

  const event = await googleRequest<any>(
    `/calendars/${encodeURIComponent(calendarId())}/events?${query}`,
    {
      method: "POST",
      body: JSON.stringify(googlePayload(input, attendees)),
    },
  );

  return {
    googleEventId: event.id ?? null,
    meetingLink: event.hangoutLink ?? event.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === "video")?.uri ?? null,
    htmlLink: event.htmlLink ?? null,
  };
}

async function updateGoogleEvent(googleEventId: string, input: SyncInput): Promise<GoogleEventResult> {
  const attendees = await attendeesForUserIds(input.attendeeIds ?? []);
  const query = new URLSearchParams({
    conferenceDataVersion: input.createMeet ? "1" : "0",
    sendUpdates: input.sendUpdates ?? "all",
  });

  const event = await googleRequest<any>(
    `/calendars/${encodeURIComponent(calendarId())}/events/${encodeURIComponent(googleEventId)}?${query}`,
    {
      method: "PATCH",
      body: JSON.stringify(googlePayload(input, attendees)),
    },
  );

  return {
    googleEventId: event.id ?? googleEventId,
    meetingLink: event.hangoutLink ?? event.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === "video")?.uri ?? null,
    htmlLink: event.htmlLink ?? null,
  };
}

export async function syncCalendarEventToGoogle(input: SyncInput): Promise<GoogleEventResult | null> {
  if (!isConfigured()) {
    return null;
  }

  try {
    const [existing] = input.localEventId
      ? await q<{ googleEventId: string | null }>`SELECT TOP 1 google_event_id AS googleEventId FROM calendar_events WHERE id = ${input.localEventId}`
      : [];
    const result = existing?.googleEventId
      ? await updateGoogleEvent(existing.googleEventId, input)
      : await createGoogleEvent(input);

    if (input.localEventId) {
      await qRaw(
        `UPDATE calendar_events
         SET google_event_id = @googleEventId, meeting_link = COALESCE(@meetingLink, meeting_link),
             google_meet_link = @meetingLink, google_html_link = @htmlLink,
             google_sync_status = @status, google_sync_error = NULL, google_synced_at = SYSDATETIMEOFFSET()
         WHERE id = @id`,
        {
          id: input.localEventId,
          googleEventId: result.googleEventId,
          meetingLink: result.meetingLink,
          htmlLink: result.htmlLink,
          status: "synced",
        },
      );
    }

    return result;
  } catch (err) {
    logger.error({ err, entityType: input.entityType, entityId: input.entityId }, "Google Calendar sync failed");
    await markSyncFailure(input.localEventId, err);
    return null;
  }
}

export async function deleteGoogleCalendarEvent(googleEventId: string | null | undefined): Promise<void> {
  if (!googleEventId || !isConfigured()) return;
  try {
    const token = await getGoogleAccessToken();
    const query = new URLSearchParams({ sendUpdates: "all" });
    const response = await fetch(
      `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId())}/events/${encodeURIComponent(googleEventId)}?${query}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok && response.status !== 410 && response.status !== 404) {
      throw new Error(`Google Calendar delete failed (${response.status}): ${await response.text()}`);
    }
  } catch (err) {
    logger.error({ err, googleEventId }, "Google Calendar delete failed");
  }
}

export async function checkGoogleAvailability(input: {
  startDate: Date | string;
  endDate?: Date | string | null;
  attendeeIds?: number[];
}): Promise<{ configured: boolean; attendees: Array<GoogleAttendee & { busy: Array<{ start: string; end: string }> }> } | null> {
  if (!isConfigured()) return { configured: false, attendees: [] };
  const attendees = await attendeesForUserIds(input.attendeeIds ?? []);
  if (!attendees.length) return { configured: true, attendees: [] };
  const start = toDate(input.startDate);
  const end = eventEnd(start, input.endDate);
  try {
    const result = await googleRequest<any>("/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        timeZone: timezone(),
        items: attendees.map(attendee => ({ id: attendee.email })),
      }),
    });
    return {
      configured: true,
      attendees: attendees.map(attendee => ({
        ...attendee,
        busy: result.calendars?.[attendee.email]?.busy ?? [],
      })),
    };
  } catch (err) {
    logger.error({ err }, "Google Calendar free/busy check failed");
    return null;
  }
}

export async function pullGoogleEventIntoLocal(googleEventId: string): Promise<boolean> {
  if (!isConfigured()) return false;
  const [local] = await q<{ id: number }>`SELECT TOP 1 id FROM calendar_events WHERE google_event_id = ${googleEventId}`;
  if (!local) return false;
  try {
    const event = await googleRequest<any>(
      `/calendars/${encodeURIComponent(calendarId())}/events/${encodeURIComponent(googleEventId)}`,
      { method: "GET" },
    );
    const start = event.start?.dateTime ?? event.start?.date;
    const end = event.end?.dateTime ?? event.end?.date ?? null;
    if (!start) return false;
    await qRaw(
      `UPDATE calendar_events
       SET title = @title, description = @description, start_date = @startDate, end_date = @endDate,
           meeting_link = COALESCE(@meetingLink, meeting_link), google_meet_link = @meetingLink,
           google_html_link = @htmlLink, google_sync_status = @status, google_sync_error = NULL,
           google_synced_at = SYSDATETIMEOFFSET()
       WHERE id = @id`,
      {
        id: local.id,
        title: event.summary ?? "Google Calendar event",
        description: event.description ?? null,
        startDate: new Date(start),
        endDate: end ? new Date(end) : null,
        meetingLink: event.hangoutLink ?? event.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === "video")?.uri ?? null,
        htmlLink: event.htmlLink ?? null,
        status: "synced_from_google",
      },
    );
    return true;
  } catch (err) {
    logger.error({ err, googleEventId }, "Google Calendar pull failed");
    return false;
  }
}

export async function pullKnownGoogleEventsIntoLocal(): Promise<{ checked: number; updated: number }> {
  if (!isConfigured()) return { checked: 0, updated: 0 };
  const rows = await q<{ googleEventId: string }>`
    SELECT google_event_id AS googleEventId FROM calendar_events
    WHERE google_event_id IS NOT NULL AND google_event_id <> ''
  `;
  let updated = 0;
  for (const row of rows) {
    if (await pullGoogleEventIntoLocal(row.googleEventId)) updated += 1;
  }
  return { checked: rows.length, updated };
}

export async function deleteEntityReminder(entityType: EntityType, entityId: number): Promise<void> {
  const [event] = await q<{ id: number; googleEventId: string | null }>`
    SELECT TOP 1 id, google_event_id AS googleEventId FROM calendar_events WHERE entity_type = ${entityType} AND entity_id = ${entityId}
  `;
  if (!event) return;
  await q`DELETE FROM calendar_events WHERE id = ${event.id}`;
  await deleteGoogleCalendarEvent(event.googleEventId);
}

export async function upsertEntityReminder(input: {
  userId: number;
  title: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  type: string;
  entityType: EntityType;
  entityId: number;
  attendeeIds?: number[];
  createMeet?: boolean;
}): Promise<void> {
  const preferences = await getNotificationPreferences(input.userId);
  if (!preferences.calendarEnabled) {
    await deleteEntityReminder(input.entityType, input.entityId);
    return;
  }

  if (!input.startDate) {
    await deleteEntityReminder(input.entityType, input.entityId);
    return;
  }
  const attendees = normalizeAttendeeIds([input.userId, ...(input.attendeeIds ?? [])]);
  const [existing] = await q<{ id: number }>`
    SELECT TOP 1 id FROM calendar_events WHERE entity_type = ${input.entityType} AND entity_id = ${input.entityId}
  `;
  const start = toDate(input.startDate);
  const end = eventEnd(start, input.endDate);

  let localEventId = existing?.id;
  if (localEventId) {
    await qRaw(
      `UPDATE calendar_events
       SET user_id = @userId, title = @title, description = @description, start_date = @startDate,
           end_date = @endDate, type = @type, attendee_ids = @attendeeIds
       WHERE id = @id`,
      {
        id: localEventId,
        userId: input.userId,
        title: input.title,
        description: input.description ?? null,
        startDate: start,
        endDate: end,
        type: input.type,
        attendeeIds: csv(attendees),
      },
    );
  } else {
    const [event] = await q`
      INSERT INTO calendar_events (user_id, title, description, start_date, end_date, type, entity_type, entity_id, attendee_ids, created_at)
      OUTPUT INSERTED.*
      VALUES (${input.userId}, ${input.title}, ${input.description ?? null}, ${start}, ${end}, ${input.type},
              ${input.entityType}, ${input.entityId}, ${csv(attendees)}, SYSDATETIMEOFFSET())`;
    localEventId = (event as any).id;
  }

  await syncCalendarEventToGoogle({
    localEventId,
    title: input.title,
    description: input.description,
    startDate: start,
    endDate: end,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    attendeeIds: attendees,
    createMeet: input.createMeet ?? true,
  });
}
