import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListTodos, useUpdateTodo, useCompleteTodo } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, ListTodo, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TodosPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const { data: todos, isLoading } = useListTodos({ type: activeTab });
  const completeTodo = useCompleteTodo();

  const handleToggle = (id: number, currentStatus: string) => {
    completeTodo.mutate({
      todoId: id,
      data: { completed: currentStatus !== "Completed" }
    });
  };

  return (
    <AppLayout title="To-Do Management">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Task Manager</h2>
            <p className="text-muted-foreground text-sm">Track your daily tasks and team action items.</p>
          </div>
          <Button>Add Task</Button>
        </div>

        <Card>
          <div className="border-b px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
                <TabsTrigger value="personal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                  Personal Tasks
                </TabsTrigger>
                <TabsTrigger value="team" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-muted-foreground data-[state=active]:text-primary">
                  Team Tasks
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>
            ) : !todos || todos.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <ListTodo className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-1">You're all caught up!</h3>
                <p className="text-muted-foreground text-sm">No pending tasks found for this view.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y">
                {todos.map(todo => (
                  <div key={todo.id} className={`p-4 flex gap-4 hover:bg-slate-50 transition-colors ${todo.status === 'Completed' ? 'opacity-60' : ''}`}>
                    <div className="pt-1">
                      <Checkbox 
                        checked={todo.status === "Completed"} 
                        onCheckedChange={() => handleToggle(todo.id, todo.status)}
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 gap-1">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className={`text-sm font-semibold ${todo.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {todo.title}
                        </h4>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2 text-muted-foreground">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                      {todo.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {todo.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(todo.dueDate), "MMM dd, yyyy")}
                          </span>
                        )}
                        <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-5">
                          {todo.priority}
                        </Badge>
                        {activeTab === "team" && todo.assignedToName && (
                          <Badge variant="secondary" className="text-[10px] font-medium py-0 h-5 bg-slate-100 text-slate-700">
                            {todo.assignedToName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
