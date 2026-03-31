import { LogViewer } from "@/components/log-viewer";

export const dynamic = "force-dynamic";

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Logs</h1>
      <LogViewer />
    </div>
  );
}
