import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notification } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";

export function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  return (
    <Card className="flex flex-col h-[300px]">
      <CardHeader className="py-4 border-b">
        <CardTitle className="text-base font-semibold">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        {notifications?.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">No new notifications</div>
        ) : (
          <div className="flex flex-col divide-y">
            {notifications?.map((notif) => (
              <div key={notif.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${notif.isRead ? 'bg-transparent border border-gray-300' : 'bg-primary'}`} />
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{notif.message}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
