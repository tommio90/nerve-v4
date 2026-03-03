"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

const typeVariants: Record<string, BadgeProps["variant"]> = {
  workflow: "proposed",
  automation: "active",
  integration: "complete",
};

const skillStatusVariants: Record<string, BadgeProps["variant"]> = {
  active: "complete",
  disabled: "deferred",
  draft: "active",
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
        <h1 className="title-3">Skills</h1>
        <p className="text-subtle">
          Reusable agent workflows — each skill encodes a repeatable procedure with specific models and perspectives.
        </p>
      </div>

      {/* Stats */}
      {!loading && skills.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-cyan">{skills.length}</div>
            <div className="text-caption">Total Skills</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{skills.filter((s) => s.status === "active").length}</div>
            <div className="text-caption">Active</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {new Set(skills.flatMap((s) => parseModels(s.models))).size}
            </div>
            <div className="text-caption">Models Used</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {skills.reduce((acc, s) => acc + s.runCount, 0)}
            </div>
            <div className="text-caption">Total Runs</div>
          </Card>
        </div>
      )}

      {/* Skill Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-5 w-2/5 rounded-full" />
              <Skeleton className="h-3 w-4/5 rounded-full" />
              <Skeleton className="h-3 w-3/5 rounded-full" />
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
                className="group relative overflow-hidden p-0 transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-ring hover:shadow-glow"
              >
                {/* Top accent */}
                <div className="h-0.5 w-full bg-gradient-to-r from-violet/60 via-cyan/50 to-transparent" />

                <CardHeader className="p-5 pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border border-violet/20 bg-violet/10 p-2">
                        <SkillIcon className="h-5 w-5 text-violet" />
                      </div>
                      <div>
                        <CardTitle>{skill.name}</CardTitle>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge variant={typeVariants[skill.type] || "proposed"} className="gap-1 text-[10px]">
                            <TypeIcon className="h-3 w-3" />
                            {skill.type}
                          </Badge>
                          <Badge variant={skillStatusVariants[skill.status] || "default"} className="gap-1 text-[10px]">
                            <CircleDot className="h-2.5 w-2.5" />
                            {skill.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 px-5 pt-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {skill.description}
                  </p>

                  {models.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-caption">
                        <Bot className="h-3.5 w-3.5" />
                        <span>Models</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {models.map((m) => (
                          <Badge key={m} variant="default" className="font-mono text-[11px] text-slate-300">
                            {formatModelName(m)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t border-border px-5 py-3 text-caption">
                  <div className="flex w-full items-center justify-between">
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
                </CardFooter>
              </Card>
            );
          })}

          {skills.length === 0 && (
            <Card className="col-span-full flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                <Sparkles className="h-6 w-6 text-violet" />
              </div>
              <p className="text-subtle">No skills configured yet.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
