import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLogin, useListDepartments } from "@workspace/api-client-react";
import { Briefcase, Building2, CalendarClock, Clock, FolderKanban, Lock, Ticket, User } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  department: z.string().optional(),
});

export default function LoginPage() {
  const { setAuth, token } = useAuth();
  const [_, setLocation] = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [loginUser, setLoginUser] = useState<any>(null);
  
  const loginMutation = useLogin();
  const { data: departments } = useListDepartments();

  useEffect(() => {
    if (token) {
      setLocation("/dashboard");
    }
  }, [token, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "EMP-001",
      password: "Admin@123",
      department: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.user);
          setLoginUser(data.user);
          toast.success(`Welcome ${data.user.name}`);
          setShowWelcome(true);
        },
        onError: () => {
          toast.error("Invalid credentials");
        }
      }
    );
  };

  const handleContinue = () => {
    setShowWelcome(false);
    setShowReminder(true);
  };

  const handleReminderClose = () => {
    setShowReminder(false);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500 blur-[100px]" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none z-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-400" />
        <CardHeader className="space-y-1 text-center pt-8 pb-6">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">SRH Penguin Ticketing Management System</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Enterprise Ticketing & Workflow System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="employee code or email" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <span className="text-xs text-primary cursor-pointer hover:underline">Forgot password?</span>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="pl-9 relative">
                          <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments?.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-6" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome Back</DialogTitle>
            <DialogDescription>
              You have successfully logged in to SRH Penguin Ticketing Management System.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 text-sm">
            {[
              ["Employee Name", loginUser?.name],
              ["Employee Code", loginUser?.employeeCode],
              ["Department", loginUser?.departmentName || "Not assigned"],
              ["Current Date", new Date().toLocaleDateString()],
              ["Last Login", loginUser?.lastLogin ? new Date(loginUser.lastLogin).toLocaleString() : "First login"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 rounded-md bg-slate-50 px-3 py-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleContinue} className="w-full">Continue to Dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReminder} onOpenChange={setShowReminder}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pending Work Reminder</DialogTitle>
            <DialogDescription>Review the items that normally need attention after login.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            {[
              { label: "Pending Tickets", icon: Ticket, href: "/tickets" },
              { label: "Pending Approvals", icon: Clock, href: "/worklist" },
              { label: "Overdue Tasks", icon: CalendarClock, href: "/todos" },
              { label: "Overdue Projects", icon: FolderKanban, href: "/projects" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className="flex items-center justify-between rounded-md border bg-amber-50 px-3 py-2 text-left text-sm text-amber-900 hover:bg-amber-100"
                  onClick={() => { setShowReminder(false); setLocation(item.href); }}
                >
                  <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {item.label}</span>
                  <span className="text-xs font-semibold uppercase">Open</span>
                </button>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleReminderClose}>Snooze</Button>
            <Button onClick={handleReminderClose}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
