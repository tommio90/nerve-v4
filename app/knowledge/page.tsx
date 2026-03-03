"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function KnowledgePage() {
  return (
    <div className="synapse-page space-y-4">
      <h1 className="title-3">Knowledge</h1>
      <Card className="p-0">
        <CardContent className="pt-4">
          <p className="text-subtle">Knowledge base — upload and manage documents for context scanning. Coming in Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
