import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-muted-foreground" />
            System Configuration
          </h2>
          <p className="text-muted-foreground text-sm">Manage global settings, master data, and workflows.</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <div className="border-b px-4">
            <Tabs defaultValue="departments" className="w-full">
              <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
                <TabsTrigger value="departments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                  Departments
                </TabsTrigger>
                <TabsTrigger value="roles" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                  Roles & Permissions
                </TabsTrigger>
                <TabsTrigger value="categories" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                  Ticket Categories
                </TabsTrigger>
                <TabsTrigger value="sla" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                  SLA Rules
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="departments" className="m-0 p-6">
                <div className="text-center text-muted-foreground py-12 border border-dashed rounded-md">
                  Department Master configuration panel
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
