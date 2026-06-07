import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListNotifications } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useListNotifications({});

  return (
    <AppLayout title="Notifications">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pt-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Your Notifications</h2>
          <p className="text-muted-foreground text-sm">Stay updated with tickets, assignments, and system alerts.</p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Bell className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground mb-1">All caught up</h3>
                <p className="text-muted-foreground text-sm">You have no new notifications.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}>
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${notif.isRead ? 'bg-transparent border border-gray-300' : 'bg-primary'}`} />
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <p className={`text-sm ${!notif.isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="uppercase tracking-wider font-semibold text-[10px]">{notif.type}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
