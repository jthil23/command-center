import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutomationTriggers } from "@/components/automation-triggers";
import { ScheduledJobs } from "@/components/scheduled-jobs";

export const dynamic = "force-dynamic";

export default function AutomationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Automations</h1>
      <Tabs defaultValue="triggers">
        <TabsList>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="jobs">Scheduled Jobs</TabsTrigger>
        </TabsList>
        <TabsContent value="triggers">
          <AutomationTriggers />
        </TabsContent>
        <TabsContent value="jobs">
          <ScheduledJobs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
