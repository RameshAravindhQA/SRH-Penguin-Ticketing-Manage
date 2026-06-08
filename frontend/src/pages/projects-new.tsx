import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProject, useListCategories, useListUsers } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listSubCategories } from "@/lib/master-data";

const projectSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  priority: z.string().min(1, "Priority is required"),
  category: z.string().optional(),
  subCategoryId: z.coerce.number().optional(),
  type: z.string().optional(),
  ownerId: z.coerce.number().optional(),
  processOwnerId: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reviewFrequency: z.string().optional(),
  sourceDepartment: z.string().optional(),
  serviceType: z.string().optional(),
  location: z.string().optional(),
  systemType: z.string().optional(),
  systemSubType: z.string().optional(),
  reviewSchedule: z.string().optional(),
  reviewDuration: z.string().optional(),
  organizationName: z.string().optional(),
  providerName: z.string().optional(),
  externalPersonRole: z.string().optional(),
  externalPhoneNo: z.string().optional(),
  supportingPerson: z.string().optional(),
});

export default function CreateProjectPage() {
  const [_, setLocation] = useLocation();
  const createProject = useCreateProject();
  const { data: users } = useListUsers();
  const { data: categories } = useListCategories();
  const { data: subCategories } = useQuery({ queryKey: ["sub-categories"], queryFn: listSubCategories });

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium",
    },
  });
  const selectedCategory = form.watch("category");
  const selectedCategoryId = categories?.find(category => category.name === selectedCategory)?.id;
  const filteredSubCategories = (subCategories || []).filter(sub => !selectedCategoryId || sub.categoryId === selectedCategoryId);

  const onSubmit = (values: z.infer<typeof projectSchema>) => {
    createProject.mutate(
      { data: values as any },
      {
        onSuccess: (data) => {
          toast.success(`Project ${data.projectNo} created successfully`);
          setLocation(`/projects/${data.id}`);
        },
        onError: () => {
          toast.error("Failed to create project");
        }
      }
    );
  };

  return (
    <AppLayout title="Create Project">
      <div className="mx-auto max-w-6xl py-4">
        <Card className="overflow-hidden border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Initiate New Project</CardTitle>
            <CardDescription>Setup project ownership, workflow classification, support details, and review plan.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-0 p-0">
                <div className="grid grid-cols-1 border-t md:grid-cols-[220px_1fr]">
                  <div className="bg-slate-50 px-4 py-3 text-sm font-semibold">Project Details</div>
                  <div className="space-y-4 p-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Title <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Network Infrastructure Upgrade Q3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 border-t md:grid-cols-[220px_1fr]">
                  <div className="bg-slate-50 px-4 py-3 text-sm font-semibold">Classification</div>
                  <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.filter(category => category.type === "project" || category.type === "general").map(category => (
                              <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subCategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sub category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredSubCategories.map(sub => (
                              <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Manager / Owner</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map(u => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="processOwnerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Process Owner</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map(u => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                </div>

                <div className="grid grid-cols-1 border-t md:grid-cols-[220px_1fr]">
                  <div className="bg-slate-50 px-4 py-3 text-sm font-semibold">Project Workflow Fields</div>
                  <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
                    {[
                      ["sourceDepartment", "From Department", "Requesting department"],
                      ["serviceType", "Service Type", "Hardware, software, service request"],
                      ["location", "Location", "Campus, block, room"],
                      ["systemType", "System Type", "Project, task, ticket"],
                      ["systemSubType", "System Sub Type", "Subtype"],
                      ["reviewDuration", "Review Duration", "e.g. 30 days"],
                      ["organizationName", "Organization", "External organization"],
                      ["providerName", "Provider Name", "Contact person"],
                      ["externalPersonRole", "Person Role", "Role"],
                      ["externalPhoneNo", "Phone No", "Phone"],
                      ["supportingPerson", "Supporting Person", "Internal support"],
                    ].map(([name, label, placeholder]) => (
                      <FormField key={name} control={form.control} name={name as any} render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl><Input placeholder={placeholder} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                    <FormField control={form.control} name="reviewSchedule" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Schedule</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="grid grid-cols-1 border-t md:grid-cols-[220px_1fr]">
                  <div className="bg-slate-50 px-4 py-3 text-sm font-semibold">Scope</div>
                  <div className="p-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope & Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide the project scope, objectives, and key deliverables..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 border-t pt-6">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Project
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </AppLayout>
  );
}
