import type { LucideIcon } from "lucide-react";

export type ModuleStatTone =
  | "sky"
  | "amber"
  | "emerald"
  | "rose"
  | "violet"
  | "slate";

export type ModuleStat = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: ModuleStatTone;
  active?: boolean;
  onClick?: () => void;
};

const toneClasses: Record<ModuleStatTone, string> = {
  sky: "bg-sky-50 border-sky-200 text-sky-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  rose: "bg-rose-50 border-rose-200 text-rose-800",
  violet: "bg-violet-50 border-violet-200 text-violet-800",
  slate: "bg-slate-50 border-slate-200 text-slate-800",
};

const iconToneClasses: Record<ModuleStatTone, string> = {
  sky: "bg-sky-100 text-sky-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
};

export function ModuleStats({ stats }: { stats: ModuleStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((stat) => {
        const tone = stat.tone ?? "slate";
        const Icon = stat.icon;
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-md ${iconToneClasses[tone]}`}>
                <Icon className="h-4 w-4" />
              </div>
              {stat.active && <span className="mt-1 h-2 w-2 rounded-full bg-current" />}
            </div>
            <div>
              <div className="text-2xl font-bold leading-none">{stat.value}</div>
              <div className="mt-1 text-xs font-semibold uppercase text-current/70">{stat.label}</div>
            </div>
          </>
        );

        const className = `flex min-h-[104px] flex-col justify-between rounded-lg border p-4 text-left shadow-sm transition ${toneClasses[tone]} ${
          stat.onClick ? "cursor-pointer hover:shadow-md" : ""
        } ${stat.active ? "ring-2 ring-current/20" : ""}`;

        if (stat.onClick) {
          return (
            <button key={stat.label} type="button" className={className} onClick={stat.onClick}>
              {content}
            </button>
          );
        }

        return (
          <div key={stat.label} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
