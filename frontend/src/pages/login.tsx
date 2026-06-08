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
import { Building2, Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  department: z.string().optional(),
});

export default function LoginPage() {
  const { setAuth, token } = useAuth();
  const [_, setLocation] = useLocation();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();
  const { data: departments } = useListDepartments();

  useEffect(() => {
    if (token) setLocation("/dashboard");
  }, [token, setLocation]);

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
          sessionStorage.setItem("login_welcome", JSON.stringify({
            loginAt: new Date().toISOString(),
            lastLogin: data.user.lastLogin || null,
          }));
          setAuth(data.token, data.user);
          toast.success(`Signed in as ${data.user.name}`);
          setLocation("/dashboard");
        },
        onError: () => toast.error("Invalid credentials"),
      },
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="flex min-h-[46vh] items-center justify-center bg-slate-50 p-6 sm:p-8 lg:min-h-screen">
          <div className="flex w-full max-w-xl flex-col items-center text-center">
            <img src="/srh-logo.png" alt="SRH" className="mb-5 h-20 w-44 object-contain sm:h-24 sm:w-52" />
            <img
              src="https://static-00.iconduck.com/assets.00/team-work-illustration-512x436-dw4dx8fk.png"
              alt="IT employees working together"
              className="mb-6 h-52 w-full max-w-sm object-contain sm:h-64"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">SRH Penguin Ticketing Management System</h1>
            <p className="mt-3 max-w-md text-sm text-slate-600">Enterprise ticketing, projects, documents, reminders, and team workflow for IT operations.</p>
          </div>
        </section>
        <section className="relative flex min-h-[54vh] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-900 p-4 sm:p-6 lg:min-h-screen">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.2),transparent_35%)]" />
          <Card className="relative w-full max-w-md border-white/20 bg-white/95 shadow-2xl backdrop-blur">
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-md bg-blue-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>Access your ticketing workspace securely.</CardDescription>
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
