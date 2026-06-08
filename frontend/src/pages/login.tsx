import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLogin, useListDepartments } from "@workspace/api-client-react";
import { Building2, CalendarClock, Eye, EyeOff, Lock, User } from "lucide-react";
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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginFlowActive, setLoginFlowActive] = useState(false);
  const [loginUser, setLoginUser] = useState<any>(null);
  const [loginReminders, setLoginReminders] = useState<any[]>([]);
  const loginMutation = useLogin();
  const { data: departments } = useListDepartments();

  useEffect(() => {
    if (token && !loginFlowActive && !showWelcome && !showReminder) setLocation("/dashboard");
  }, [loginFlowActive, showReminder, showWelcome, token, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: localStorage.getItem("remember_username") || "EMP-001",
      password: "",
      department: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    const remember = (document.getElementById("remember-login") as HTMLInputElement | null)?.checked;
    if (remember) localStorage.setItem("remember_username", values.username);
    else localStorage.removeItem("remember_username");

    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setLoginFlowActive(true);
          setAuth(data.token, data.user);
          setLoginUser(data.user);
          const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
          fetch(`${baseUrl}/api/calendar/events`, { headers: { Authorization: `Bearer ${data.token}` } })
            .then(response => response.ok ? response.json() : [])
            .then(events => {
              const now = Date.now();
              const nextDay = now + 24 * 60 * 60 * 1000;
              setLoginReminders((events || []).filter((event: any) => {
                const time = new Date(event.startDate).getTime();
                return time >= now && time <= nextDay;
              }));
            })
            .catch(() => setLoginReminders([]));
          toast.success(`Welcome ${data.user.name}`);
          setShowWelcome(true);
        },
        onError: () => toast.error("Invalid credentials"),
      },
    );
  };

  const handleContinue = () => {
    setShowWelcome(false);
    if (loginReminders.length) setShowReminder(true);
    else {
      setLoginFlowActive(false);
      setLocation("/dashboard");
    }
  };
  const handleReminderClose = () => {
    setShowReminder(false);
    setLoginFlowActive(false);
    setLocation("/dashboard");
  };
  const hour = new Date().getHours();
  const wish = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="flex min-h-[42vh] items-center justify-center bg-slate-50 p-6 sm:p-8 lg:min-h-screen">
          <div className="max-w-md text-center">
            <img src="/srh-logo.png" alt="SRH" className="mx-auto mb-6 h-24 w-48 object-contain sm:h-28 sm:w-56" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">SRH Penguin Ticketing Management System</h1>
            <p className="mt-3 text-sm text-slate-600">Enterprise ticketing, projects, documents, reminders, and team workflow.</p>
          </div>
        </section>
        <section className="flex min-h-[58vh] items-center justify-center bg-gradient-to-br from-sky-50 via-emerald-50 to-indigo-50 p-4 sm:p-6 lg:min-h-screen">
          <Card className="w-full max-w-md border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>Use your employee code or email.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
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
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setForgotOpen(true)}>Forgot password?</button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type={showPassword ? "text" : "password"} placeholder="Password" className="pl-9 pr-10" {...field} />
                          <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPassword(v => !v)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="relative pl-9">
                            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Optional department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>{departments?.map(dept => <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex items-center gap-2 text-sm">
                    <input id="remember-login" type="checkbox" className="h-4 w-4" defaultChecked={!!localStorage.getItem("remember_username")} />
                    <Label htmlFor="remember-login" className="font-normal">Remember me</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Authenticating..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hi {loginUser?.name || "there"}, {wish}</DialogTitle>
            <DialogDescription>You have successfully logged in.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 text-sm">
            {[
              ["Employee Name", loginUser?.name],
              ["Employee Code", loginUser?.employeeCode],
              ["Department", loginUser?.departmentName || "Not assigned"],
              ["Login Time", new Date().toLocaleString()],
              ["Last Login", loginUser?.lastLogin ? new Date(loginUser.lastLogin).toLocaleString() : "First login"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 rounded-md bg-slate-50 px-3 py-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
            <div className="rounded-md border bg-blue-50 px-3 py-2 text-blue-900">
              <span className="font-medium">Today:</span> Small progress today keeps every workflow moving tomorrow.
            </div>
          </div>
          <DialogFooter><Button onClick={handleContinue} className="w-full">Continue</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReminder} onOpenChange={setShowReminder}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upcoming Reminders</DialogTitle>
            <DialogDescription>These reminders are due in the next 24 hours.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            {loginReminders.map(item => (
              <button key={item.id} className="flex items-center justify-between rounded-md border bg-amber-50 px-3 py-2 text-left text-sm text-amber-900 hover:bg-amber-100" onClick={() => { setShowReminder(false); setLocation("/reminders"); }}>
                <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> {item.title}</span>
                <span className="text-xs font-semibold uppercase">{new Date(item.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleReminderClose}>Snooze</Button>
            <Button onClick={handleReminderClose}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>Submit a reset request to the administrator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Email</Label>
            <Input type="email" placeholder="employee@company.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.success("Password reset request sent to administrator"); setForgotOpen(false); }}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
