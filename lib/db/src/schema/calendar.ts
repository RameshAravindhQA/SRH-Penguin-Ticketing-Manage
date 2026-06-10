export type CalendarEvent = {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  type: string;
  entityType: string | null;
  entityId: number | null;
  meetingLink: string | null;
  googleEventId: string | null;
  googleMeetLink: string | null;
  googleHtmlLink: string | null;
  googleSyncStatus: string | null;
  googleSyncError: string | null;
  googleSyncedAt: Date | null;
  attendeeIds: string | null;
  createdAt: Date;
};

export type InsertCalendarEvent = Omit<CalendarEvent, "id" | "createdAt">;
