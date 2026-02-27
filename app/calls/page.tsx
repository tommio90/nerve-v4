import { Card } from "@/components/ui/card";

export default function CallsPage() {
  return (
    <div className="synapse-page space-y-4">
      <h1 className="synapse-heading">Calls</h1>
      <Card>
        <p className="text-sm">Call management endpoint is available at <code>/api/calls</code>.</p>
      </Card>
    </div>
  );
}
