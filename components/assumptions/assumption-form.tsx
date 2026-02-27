"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AssumptionForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [riskLevel, setRiskLevel] = useState(3);

  const submit = async () => {
    if (!title.trim() || !description.trim()) return;
    await fetch("/api/assumptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, riskLevel }),
    });
    setTitle("");
    setDescription("");
    setRiskLevel(3);
    onCreated();
  };

  return (
    <div className="space-y-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assumption title" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Assumption description" />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Risk Level</span>
        <input
          type="range"
          min={1}
          max={5}
          value={riskLevel}
          onChange={(e) => setRiskLevel(Number(e.target.value))}
          className="w-full"
        />
        <span className="text-foreground">{riskLevel}</span>
      </div>
      <Button onClick={submit}>Create Assumption</Button>
    </div>
  );
}
