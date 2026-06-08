import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  tone?: "sky" | "emerald" | "amber" | "orange" | "violet" | "rose" | "indigo" | "slate";
  active?: boolean;
  onClick?: () => void;
}

const toneClasses = {
  sky: { card: "border-sky-200 bg-sky-50/70", icon: "bg-sky-100 text-sky-700" },
  emerald: { card: "border-emerald-200 bg-emerald-50/70", icon: "bg-emerald-100 text-emerald-700" },
  amber: { card: "border-amber-200 bg-amber-50/70", icon: "bg-amber-100 text-amber-700" },
  orange: { card: "border-orange-200 bg-orange-50/70", icon: "bg-orange-100 text-orange-700" },
  violet: { card: "border-violet-200 bg-violet-50/70", icon: "bg-violet-100 text-violet-700" },
  rose: { card: "border-rose-200 bg-rose-50/70", icon: "bg-rose-100 text-rose-700" },
  indigo: { card: "border-indigo-200 bg-indigo-50/70", icon: "bg-indigo-100 text-indigo-700" },
  slate: { card: "border-slate-200 bg-white", icon: "bg-slate-100 text-slate-700" },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp = true,
  tone = "slate",
  active = false,
  onClick,
}: StatCardProps) {
  const colors = toneClasses[tone];
  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "rounded-md transition hover:shadow-md",
        colors.card,
        onClick && "cursor-pointer",
        active && "ring-2 ring-primary ring-offset-1"
      )}
    >
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm font-medium">{title}</span>
          <span className={cn("rounded-md p-2", colors.icon)}>
            <Icon className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {trend && (
            <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trendUp ? '+' : ''}{trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
