import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp = true }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm font-medium">{title}</span>
          <Icon className="w-4 h-4" />
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
