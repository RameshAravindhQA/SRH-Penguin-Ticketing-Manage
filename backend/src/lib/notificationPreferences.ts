import { q, qRaw } from "@workspace/db";

export type NotificationPreferences = {
  userId: number;
  inAppEnabled: boolean;
  spaceEnabled: boolean;
  mailEnabled: boolean;
  calendarEnabled: boolean;
  updatedAt: Date | string | null;
};

const defaults = {
  inAppEnabled: true,
  spaceEnabled: true,
  mailEnabled: false,
  calendarEnabled: true,
};

function toBool(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  return !!value;
}

function format(row: any, userId: number): NotificationPreferences {
  return {
    userId,
    inAppEnabled: toBool(row?.inAppEnabled, defaults.inAppEnabled),
    spaceEnabled: toBool(row?.spaceEnabled, defaults.spaceEnabled),
    mailEnabled: toBool(row?.mailEnabled, defaults.mailEnabled),
    calendarEnabled: toBool(row?.calendarEnabled, defaults.calendarEnabled),
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function getNotificationPreferences(userId: number): Promise<NotificationPreferences> {
  const [row] = await q`
    SELECT TOP 1 * FROM notification_preferences WHERE user_id = ${userId}
  `;
  return format(row, userId);
}

export async function upsertNotificationPreferences(
  userId: number,
  input: Partial<Omit<NotificationPreferences, "userId" | "updatedAt">>,
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(userId);
  const next = {
    inAppEnabled: input.inAppEnabled ?? current.inAppEnabled,
    spaceEnabled: input.spaceEnabled ?? current.spaceEnabled,
    mailEnabled: input.mailEnabled ?? current.mailEnabled,
    calendarEnabled: input.calendarEnabled ?? current.calendarEnabled,
  };

  const [row] = await qRaw(
    `MERGE notification_preferences AS target
     USING (SELECT @userId AS user_id) AS source
     ON target.user_id = source.user_id
     WHEN MATCHED THEN UPDATE SET
       in_app_enabled = @inAppEnabled,
       space_enabled = @spaceEnabled,
       mail_enabled = @mailEnabled,
       calendar_enabled = @calendarEnabled,
       updated_at = SYSDATETIMEOFFSET()
     WHEN NOT MATCHED THEN INSERT
       (user_id, in_app_enabled, space_enabled, mail_enabled, calendar_enabled, updated_at)
       VALUES (@userId, @inAppEnabled, @spaceEnabled, @mailEnabled, @calendarEnabled, SYSDATETIMEOFFSET())
     OUTPUT INSERTED.*;`,
    {
      userId,
      inAppEnabled: next.inAppEnabled,
      spaceEnabled: next.spaceEnabled,
      mailEnabled: next.mailEnabled,
      calendarEnabled: next.calendarEnabled,
    },
  );

  return format(row, userId);
}
