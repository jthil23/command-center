import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaQueues } from "@/components/media-queues";
import { MediaTriggers } from "@/components/media-triggers";
import { MissingItems } from "@/components/missing-items";
import { HuntDashboard } from "@/components/hunt-dashboard";
import { HuntHistory } from "@/components/hunt-history";

export const dynamic = "force-dynamic";

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Media</h1>

      <Tabs defaultValue="queues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queues">Status & Queues</TabsTrigger>
          <TabsTrigger value="triggers">Triggers & Missing</TabsTrigger>
          <TabsTrigger value="hunt">Hunt Engine</TabsTrigger>
        </TabsList>

        <TabsContent value="queues" className="space-y-4">
          <MediaQueues />
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          <MediaTriggers />
          <MissingItems />
        </TabsContent>

        <TabsContent value="hunt" className="space-y-6">
          <HuntDashboard />
          <HuntHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
