import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Video } from "lucide-react";

export function CalendarPanel({ events }: { events: CalendarEvent[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="py-4 border-b">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span>My Calendar</span>
          <Button variant="outline" size="sm" className="h-7 text-xs font-medium">Sync with Google Calendar</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {events?.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">No upcoming events</div>
        ) : (
          <div className="flex flex-col divide-y">
            {events?.slice(0, 3).map((event) => (
              <div key={event.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-md shrink-0">
                  <span className="text-xs font-bold uppercase">{format(new Date(event.startDate), "MMM")}</span>
                  <span className="text-lg font-bold leading-none">{format(new Date(event.startDate), "dd")}</span>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate text-foreground">{event.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{format(new Date(event.startDate), "h:mm a")}</span>
                  </div>
                  {event.meetingLink && (
                    <a href={event.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                      <Video className="w-3 h-3" />
                      Join Meeting
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
