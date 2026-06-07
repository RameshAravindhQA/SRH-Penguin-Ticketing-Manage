import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListCalendarEvents } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Video } from "lucide-react";

export default function CalendarPage() {
  const { data: events, isLoading } = useListCalendarEvents({});
  const today = new Date();
  const startDate = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  return (
    <AppLayout title="Calendar">
      <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{format(today, "MMMM yyyy")}</h2>
            <div className="flex items-center border rounded-md overflow-hidden bg-white shadow-sm">
              <Button variant="ghost" size="icon" className="h-8 rounded-none border-r"><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" className="h-8 rounded-none font-medium px-4 border-r">Today</Button>
              <Button variant="ghost" size="icon" className="h-8 rounded-none"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-md">
              <Button variant="ghost" size="sm" className="h-7 text-xs font-medium bg-white shadow-sm">Week</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground">Month</Button>
            </div>
            <Button className="h-9 gap-2">
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          </div>
        </div>

        <Card className="flex-1 overflow-hidden shadow-sm flex flex-col min-h-0">
          <div className="grid grid-cols-7 border-b shrink-0 bg-slate-50/50">
            {weekDays.map((date, i) => {
              const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
              return (
                <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                  <div className={`text-xs font-semibold uppercase mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(date, "EEE")}
                  </div>
                  <div className={`text-lg font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {format(date, "d")}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex-1 overflow-auto bg-slate-50/30 p-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground p-8">Loading calendar...</div>
            ) : !events || events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>No events scheduled for this period.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="bg-white border rounded-md p-4 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-primary">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">{event.title}</h4>
                      <span className="text-xs font-medium text-muted-foreground bg-slate-100 px-2 py-1 rounded">
                        {format(new Date(event.startDate), "h:mm a")}
                      </span>
                    </div>
                    {event.description && <p className="text-sm text-muted-foreground mb-3">{event.description}</p>}
                    {event.meetingLink && (
                      <a href={event.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-1.5 rounded hover:bg-primary/20 transition-colors">
                        <Video className="w-3.5 h-3.5" />
                        Join Meeting
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
