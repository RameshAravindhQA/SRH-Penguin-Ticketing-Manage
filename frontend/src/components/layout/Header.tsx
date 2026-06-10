import React from "react";
import { Menu, Search, Bell, Calendar, ChevronDown, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useConfirmation } from "@/components/shared/ConfirmationProvider";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const confirm = useConfirmation();

  const confirmLogout = async () => {
    const confirmed = await confirm({
      title: "Sign out?",
      description: "Your current session will be closed and you will return to the login page.",
      confirmText: "Sign Out",
      variant: "destructive",
    });
    if (confirmed) logout();
  };

  return (
    <header className="h-16 bg-white border-b border-border px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-10">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors" aria-label="Toggle navigation">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-foreground tracking-tight sm:text-xl">{title}</h1>
        {user?.role && (
          <Badge variant="secondary" className="text-xs font-semibold uppercase bg-blue-100 text-blue-700 hover:bg-blue-100 hidden md:inline-flex">
            {user.role}
          </Badge>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <button className="hidden p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors sm:inline-flex" aria-label="Search">
          <Search className="w-5 h-5" />
        </button>
        
        <Link href="/notifications">
          <div className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors relative cursor-pointer">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
          </div>
        </Link>
        
        <Link href="/calendar">
          <div className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors cursor-pointer">
            <Calendar className="w-5 h-5" />
          </div>
        </Link>

        <div className="hidden h-6 w-px bg-border mx-1 sm:block"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-secondary p-1 rounded-md transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.name?.substring(0, 2).toUpperCase() || "US"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium leading-none">{user?.name || "User"}</span>
              </div>
              <ChevronDown className="hidden w-4 h-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer w-full">
                <UserIcon className="w-4 h-4" />
                Profile & Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); confirmLogout(); }} className="text-destructive focus:bg-destructive/10 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
