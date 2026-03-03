import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function CallsPage() {
  return (
    <div className="synapse-page space-y-4">
      <h1 className="title-3">Calls</h1>
      <Card>
        <CardHeader>
          <CardTitle>Call Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Call management endpoint is available at <code>/api/calls</code>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
