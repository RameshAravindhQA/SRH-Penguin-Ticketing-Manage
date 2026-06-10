import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export type SelectableUser = {
  id: number | string;
  name: string;
  avatarUrl?: string | null;
};

interface UserSelectProps {
  users: SelectableUser[] | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  excludeIds?: (number | string)[];
  /** Extra static options (e.g. {value: "all", label: "All"}) shown above the employee list. */
  extraOptions?: { value: string; label: string }[];
}

/** Searchable single-user picker, used wherever a long employee list needs to be filtered. */
export function UserSelect({ users, value, onChange, placeholder = "Select user", className, excludeIds, extraOptions }: UserSelectProps) {
  const [open, setOpen] = React.useState(false);
  const excluded = new Set((excludeIds ?? []).map(String));
  const options = (users ?? []).filter((u) => !excluded.has(String(u.id)));
  const selectedExtra = extraOptions?.find((o) => o.value === value);
  const selected = options.find((u) => String(u.id) === value);
  const label = selectedExtra?.label ?? selected?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal bg-white", !label && "text-muted-foreground", className)}
        >
          <span className="truncate">{label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search employees..." />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            {extraOptions?.length ? (
              <CommandGroup>
                {extraOptions.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("h-4 w-4", opt.value === value ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            <CommandGroup>
              {options.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => {
                    onChange(String(user.id));
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", String(user.id) === value ? "opacity-100" : "opacity-0")} />
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.avatarUrl || ""} />
                    <AvatarFallback className="text-[10px]">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface UserMultiSelectProps {
  users: SelectableUser[] | undefined;
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

/** Searchable multi-user checklist, used for attendee/employee pickers with long lists. */
export function UserMultiSelect({ users, value, onChange, className }: UserMultiSelectProps) {
  const [search, setSearch] = React.useState("");
  const options = (users ?? []).filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search employees..."
          className="pl-8 h-8 text-sm"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid max-h-36 grid-cols-1 gap-2 overflow-auto rounded-md border p-2 md:grid-cols-2">
        {options.length === 0 ? (
          <p className="col-span-full py-2 text-center text-sm text-muted-foreground">No employees found.</p>
        ) : (
          options.map((user) => {
            const id = String(user.id);
            const checked = value.includes(id);
            return (
              <label key={user.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggle(id)} />
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatarUrl || ""} />
                  <AvatarFallback className="text-[10px]">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate">{user.name}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
