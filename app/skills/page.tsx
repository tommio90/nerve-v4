"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Bot,
  Brain,
  CircleDot,
  Clock,
  FileText,
  Layers,
  Play,
  Power,
  Sparkles,
  Wand,
  Zap,
} from "lucide-react";

type Skill = {
  id: string;
  name: string;
  description: string;
  status: string;
  type: string;
  models: string;
  config: string;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
};

const typeIcons: Record<string, typeof Wand> = {
  workflow: Layers,
  automation: Zap,
  integration: Activity,
};

const typeColors: Record<string, string> = {
  workflow: "bg-cyan/12 text-cyan border-cyan/35",
  automation: "bg-amber-500/10 text-amber-300 border-amber-400/30",
  integration: "bg-emerald/12 text-emerald border-emerald/35",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald/12 text-emerald border-emerald/35",
  disabled: "bg-white/8 text-slate-300 border-white/20",
  draft: "bg-amber-500/10 text-amber-300 border-amber-400/30",
};

const skillIcons: Record<string, typeof Wand> = {
  "nerve-council-review": Brain,
  "nerve-task-executor": Play,
  "memory-maintenance": FileText,
  "nerve-artifact-writer": FileText,
};

function parseModels(modelsJson: string): string[] {
  try {
    return JSON.parse(modelsJson);
  } catch {
    return [];
  }
}

function parseConfig(configJson: string): Record<string, string> {
  try {
    return JSON.parse(configJson);
  } catch {
    return {};
  }
}

function formatModelName(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1];
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso).getTime();
  const diff = date - Date.now();
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diff) < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (Math.abs(diff) < day) return rtf.format(Math.round(diff / hour), "hour");
  return rtf.format(Math.round(diff / day), "day");
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        setSkills(data.skills);
        setLoading(false);
      });
  }, []);

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <div>
        <h1 className="synapse-heading">Skills</h1>
        <p className="text-sm text-muted-foreground">
          Reusable agent workflows — each skill encodes a repeatable procedure with specific models and perspectives.
        </p>
      </div>

      {/* Stats */}
      {!loading && skills.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-cyan">{skills.length}</div>
            <div className="text-xs text-muted-foreground">Total Skills</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{skills.filter((s) => s.status === "active").length}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {new Set(skills.flatMap((s) => parseModels(s.models))).size}
            </div>
            <div className="text-xs text-muted-foreground">Models Used</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {skills.reduce((acc, s) => acc + s.runCount, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Runs</div>
          </Card>
        </div>
      )}

      {/* Skill Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse space-y-3 p-5">
              <div className="h-5 w-2/5 rounded-full bg-muted/50" />
              <div className="h-3 w-4/5 rounded-full bg-muted/40" />
              <div className="h-3 w-3/5 rounded-full bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {skills.map((skill) => {
            const models = parseModels(skill.models);
            const config = parseConfig(skill.config);
            const TypeIcon = typeIcons[skill.type] || Wand;
            const SkillIcon = skillIcons[skill.name] || Bot;

            return (
              <Card
                key={skill.id}
              className="group relative overflow-hidden transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-violet/40 hover:shadow-violet-glow"
              >
                {/* Top accent */}
                <div className="h-0.5 w-full bg-gradient-to-r from-violet/60 via-cyan/50 to-transparent" />

                <div className="space-y-4 p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border border-violet/20 bg-violet/10 p-2">
                        <SkillIcon className="h-5 w-5 text-violet" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold tracking-tight">{skill.name}</h3>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeColors[skill.type] || typeColors.workflow}`}>
                            <TypeIcon className="h-3 w-3" />
                            {skill.type}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[skill.status]}`}>
                            <CircleDot className="h-2.5 w-2.5" />
                            {skill.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {skill.description}
                  </p>

                  {/* Models */}
                  {models.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Bot className="h-3.5 w-3.5" />
                        <span>Models</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {models.map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-slate-300"
                          >
                            {formatModelName(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {config.schedule && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {String(config.schedule)}
                        </span>
                      )}
                      {skill.runCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {skill.runCount} runs
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1">
                      <Power className="h-3 w-3" />
                      {skill.lastRunAt ? formatRelative(skill.lastRunAt) : "Never run"}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}

          {skills.length === 0 && (
            <Card className="col-span-full flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                <Sparkles className="h-6 w-6 text-violet" />
              </div>
              <p className="text-sm text-muted-foreground">No skills configured yet.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
