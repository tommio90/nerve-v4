import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="synapse-page space-y-4">
      <h1 className="title-3">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Single-user mode enabled. Configure environment variables in <code>.env</code>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
