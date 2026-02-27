import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="synapse-page space-y-4">
      <h1 className="synapse-heading">Settings</h1>
      <Card>
        <p className="text-sm">Single-user mode enabled. Configure environment variables in <code>.env</code>.</p>
      </Card>
    </div>
  );
}
