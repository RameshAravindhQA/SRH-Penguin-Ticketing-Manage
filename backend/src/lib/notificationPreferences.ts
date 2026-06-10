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

async function ensureNotificationPreferencesTable(): Promise<void> {
  await qRaw(
    `IF OBJECT_ID('notification_preferences', 'U') IS NULL
     CREATE TABLE notification_preferences (
       user_id INT NOT NULL PRIMARY KEY,
       in_app_enabled BIT NOT NULL CONSTRAINT DF_notification_preferences_in_app_enabled DEFAULT 1,
       space_enabled BIT NOT NULL CONSTRAINT DF_notification_preferences_space_enabled DEFAULT 1,
       mail_enabled BIT NOT NULL CONSTRAINT DF_notification_preferences_mail_enabled DEFAULT 0,
       calendar_enabled BIT NOT NULL CONSTRAINT DF_notification_preferences_calendar_enabled DEFAULT 1,
       updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_notification_preferences_updated_at DEFAULT SYSDATETIMEOFFSET()
     )`,
  );
}

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
  await ensureNotificationPreferencesTable();
  const [row] = await q`
    SELECT TOP 1 * FROM notification_preferences WHERE user_id = ${userId}
  `;
  return format(row, userId);
}

export async function upsertNotificationPreferences(
  userId: number,
  input: Partial<Omit<NotificationPreferences, "userId" | "updatedAt">>,
): Promise<NotificationPreferences> {
  await ensureNotificationPreferencesTable();
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
