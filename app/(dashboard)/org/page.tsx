"use client";

import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Plus, Pencil, Trash2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrgMember = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  type: string;
  avatar: string | null;
  initials: string | null;
  status: string;
  parentId: string | null;
  metadata: string;
  createdAt: string;
};

type MemberForm = {
  name: string;
  role: string;
  department: string;
  type: string;
  initials: string;
  avatar: string;
  status: string;
  parentId: string;
};

const EMPTY_FORM: MemberForm = {
  name: "",
  role: "",
  department: "",
  type: "human",
  initials: "",
  avatar: "",
  status: "active",
  parentId: "",
};

const NONE_PARENT = "__none__";

// ─── Dept Colors ──────────────────────────────────────────────────────────────

const DEPT_PALETTE: Record<string, string> = {
  Engineering: "#6366f1",
  "Product Engineering": "#6366f1",
  AI: "#06b6d4",
  "Artificial Intelligence": "#06b6d4",
  Product: "#10b981",
  "Product Management": "#10b981",
  Finance: "#f59e0b",
  Marketing: "#ec4899",
  Operations: "#8b5cf6",
  Design: "#f97316",
  Research: "#3b82f6",
  "Customer Success": "#0ea5e9",
  Sales: "#22c55e",
  HR: "#d946ef",
  Legal: "#94a3b8",
};

function deptColor(dept: string | null) {
  if (!dept) return "#6b7280";
  if (DEPT_PALETTE[dept]) return DEPT_PALETTE[dept];
  let h = 0;
  for (let i = 0; i < dept.length; i++) h = dept.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const GAP_X = 220;
const GAP_Y = 160;

function buildLayout(members: OrgMember[]): Map<string, { x: number; y: number }> {
  const childrenMap = new Map<string | null, string[]>();
  members.forEach((m) => {
    const key = m.parentId ?? null;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(m.id);
  });

  const subtreeWidths = new Map<string, number>();
  function computeWidth(id: string): number {
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) { subtreeWidths.set(id, 1); return 1; }
    const total = children.reduce((s, c) => s + computeWidth(c), 0);
    subtreeWidths.set(id, total);
    return total;
  }

  const memberSet = new Set(members.map((m) => m.id));
  const roots = members.filter((m) => !m.parentId || !memberSet.has(m.parentId));
  roots.forEach((r) => computeWidth(r.id));

  const positions = new Map<string, { x: number; y: number }>();
  function assignPos(id: string, cx: number, y: number) {
    positions.set(id, { x: cx - 90, y });
    const children = childrenMap.get(id) ?? [];
    const totalWidth = children.reduce((s, c) => s + (subtreeWidths.get(c) ?? 1), 0);
    let startX = cx - ((totalWidth - 1) * GAP_X) / 2;
    children.forEach((cId) => {
      const w = subtreeWidths.get(cId) ?? 1;
      assignPos(cId, startX + ((w - 1) * GAP_X) / 2, y + GAP_Y);
      startX += w * GAP_X;
    });
  }

  const rootTotalW = roots.reduce((s, r) => s + (subtreeWidths.get(r.id) ?? 1), 0);
  let rx = -((rootTotalW - 1) * GAP_X) / 2;
  roots.forEach((root) => {
    const w = subtreeWidths.get(root.id) ?? 1;
    assignPos(root.id, rx + ((w - 1) * GAP_X) / 2, 0);
    rx += w * GAP_X;
  });

  return positions;
}

// ─── Custom Node ──────────────────────────────────────────────────────────────

type NodeData = OrgMember & {
  onEdit: (m: OrgMember) => void;
  onDelete: (id: string) => void;
};

function OrgCard({ data }: { data: NodeData }) {
  const isAgent = data.type === "agent";
  const color = deptColor(data.department);
  const initials = data.initials || data.name.slice(0, 2).toUpperCase();

  return (
    <div
      style={{ borderColor: isAgent ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.1)" }}
      className={`relative w-[180px] rounded-xl border bg-popover shadow-xl transition-all hover:scale-[1.02] ${isAgent ? "shadow-cyan-500/10" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-border" />
      <div
        className="h-[3px] w-full rounded-t-xl"
        style={{ background: color }}
      />
      <div className="px-3 pb-3 pt-2">
        {data.department && (
          <div
            className="mb-2 truncate text-[9px] font-bold uppercase tracking-widest"
            style={{ color }}
          >
            {data.department}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {data.avatar ? (
            <img
              src={data.avatar}
              alt={data.name}
              className={`h-9 w-9 shrink-0 rounded-full object-cover ${isAgent ? "ring-2 ring-cyan/50" : ""}`}
            />
          ) : (
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                isAgent
                  ? "bg-cyan/20 text-cyan ring-2 ring-cyan/40"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {isAgent ? <Bot className="h-4 w-4" /> : initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-semibold text-white">{data.name}</div>
            <div className="truncate text-[10px] text-zinc-400">{data.role}</div>
          </div>
          {isAgent && (
            <Badge variant="proposed" className="shrink-0 px-1 py-0 text-[8px] font-bold">
              AI
            </Badge>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                data.status === "active"
                  ? "bg-emerald-400"
                  : data.status === "away"
                  ? "bg-yellow-400"
                  : "bg-zinc-600"
              }`}
            />
            <span className="text-[9px] capitalize text-zinc-500">{data.status}</span>
          </div>
          <div className="nodrag flex gap-1">
            <button
              onClick={() => data.onEdit(data)}
              className="rounded p-0.5 text-zinc-600 transition hover:text-zinc-300"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={() => data.onDelete(data.id)}
              className="rounded p-0.5 text-zinc-600 transition hover:text-red-400"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-border" />
    </div>
  );
}

const nodeTypes = { orgCard: OrgCard };

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function MemberModal({
  open,
  onClose,
  onSave,
  initial,
  members,
  editingId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: MemberForm) => void;
  initial: MemberForm;
  members: OrgMember[];
  editingId?: string;
}) {
  const [form, setForm] = useState<MemberForm>(initial);
  useEffect(() => setForm(initial), [initial]);

  const set = (k: keyof MemberForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit Member" : "Add Member"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {(
            [
              { label: "Name", key: "name", placeholder: "Full name", required: true },
              { label: "Role", key: "role", placeholder: "e.g. VP of AI", required: true },
              { label: "Department", key: "department", placeholder: "e.g. Artificial Intelligence", required: false },
              { label: "Initials", key: "initials", placeholder: "e.g. GT (optional)", required: false },
              { label: "Avatar URL", key: "avatar", placeholder: "https://… (optional)", required: false },
            ] as { label: string; key: keyof MemberForm; placeholder: string; required: boolean }[]
          ).map(({ label, key, placeholder, required }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`member-${key}`} className="text-[10px] text-zinc-400">
                {label}{required ? " *" : ""}
              </Label>
              <Input
                id={`member-${key}`}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="human">👤 Human</SelectItem>
                  <SelectItem value="agent">🤖 AI Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">● Active</SelectItem>
                  <SelectItem value="away">● Away</SelectItem>
                  <SelectItem value="offline">● Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-400">Reports To</Label>
            <Select
              value={form.parentId || NONE_PARENT}
              onValueChange={(v) => set("parentId", v === NONE_PARENT ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_PARENT}>— No parent (root) —</SelectItem>
                {members
                  .filter((m) => m.id !== editingId)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} — {m.role}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            onClick={() => { if (!form.name || !form.role) return; onSave(form); }}
            className="bg-cyan/20 text-cyan hover:bg-cyan/30 text-xs"
          >
            {editingId ? "Save Changes" : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgPage() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
  const [formInit, setFormInit] = useState<MemberForm>(EMPTY_FORM);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/org?t=${Date.now()}`, { cache: "no-store" });
      const data = (await res.json()) as { members: OrgMember[]; error?: string };
      if (data.error) console.error("[org] API error:", data.error);
      setMembers(data.members ?? []);
    } catch (err) { console.error("[org] fetch error:", err); setMembers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleEdit = useCallback((m: OrgMember) => {
    setEditingMember(m);
    setFormInit({
      name: m.name,
      role: m.role,
      department: m.department ?? "",
      type: m.type,
      initials: m.initials ?? "",
      avatar: m.avatar ?? "",
      status: m.status,
      parentId: m.parentId ?? "",
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Remove this member from the org chart?")) return;
    await fetch(`/api/org/${id}`, { method: "DELETE" });
    await load();
  }, [load]);

  const handleSave = async (form: MemberForm) => {
    const body = {
      name: form.name,
      role: form.role,
      department: form.department || null,
      type: form.type,
      initials: form.initials || null,
      avatar: form.avatar || null,
      status: form.status,
      parentId: form.parentId || null,
    };
    if (editingMember) {
      await fetch(`/api/org/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setModalOpen(false);
    setEditingMember(null);
    await load();
  };

  const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    if (!members.length) return { nodes: [], edges: [] };

    const positions = buildLayout(members);

    const nodes: Node[] = members.map((m) => ({
      id: m.id,
      type: "orgCard",
      position: positions.get(m.id) ?? { x: 0, y: 0 },
      data: { ...m, onEdit: handleEdit, onDelete: handleDelete },
    }));

    const edges: Edge[] = members
      .filter((m) => m.parentId)
      .map((m) => ({
        id: `${m.parentId}-${m.id}`,
        source: m.parentId!,
        target: m.id,
        type: "smoothstep",
        style: { stroke: "rgba(255,255,255,0.12)", strokeWidth: 1.5 },
      }));

    return { nodes, edges };
  }, [members, handleEdit, handleDelete]);

  const [rfNodes, , onNodesChange] = useNodesState(nodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(edges);

  const [key, setKey] = useState(0);
  useEffect(() => setKey((k) => k + 1), [members]);

  const humanCount = members.filter((m) => m.type === "human").length;
  const agentCount = members.filter((m) => m.type === "agent").length;

  if (!mounted) return null;

  return (
    <div className="animate-fade-in flex h-[calc(100vh-4rem)] flex-col gap-4 md:h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="title-3 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-violet" />
            Live Org Chart
          </h1>
          <p className="text-subtle">
            {humanCount} human{humanCount !== 1 ? "s" : ""} · {agentCount} AI agent{agentCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingMember(null);
            setFormInit(EMPTY_FORM);
            setModalOpen(true);
          }}
          className="gap-2 bg-cyan/20 text-cyan hover:bg-cyan/30"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Legend */}
      <div className="flex shrink-0 items-center gap-4 text-[11px] text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          Active
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          Away
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-zinc-600" />
          Offline
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-cyan/50 bg-cyan/10" />
          AI Agent
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-border bg-zinc-800" />
          Human
        </div>
      </div>

      {/* Chart */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-popover">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-[180px] rounded-xl" />
              ))}
            </div>
          </div>
        ) : members.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full border border-violet/30 bg-violet/10 p-4">
              <GitBranch className="h-8 w-8 text-violet" />
            </div>
            <p className="text-sm text-zinc-500">No members yet — add someone to start building the org chart.</p>
            <Button
              onClick={() => { setEditingMember(null); setFormInit(EMPTY_FORM); setModalOpen(true); }}
              className="gap-2 bg-cyan/20 text-cyan hover:bg-cyan/30"
            >
              <Plus className="h-4 w-4" /> Add First Member
            </Button>
          </div>
        ) : (
          <ReactFlow
            key={key}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.1}
            maxZoom={2}
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(255,255,255,0.04)"
            />
            <Controls
              className="!border-border !bg-popover"
              showInteractive={false}
            />
            <MiniMap
              nodeColor={(n) => {
                const d = n.data as OrgMember;
                return d.type === "agent" ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.15)";
              }}
              maskColor="rgba(0,0,0,0.6)"
              className="!rounded-xl !border !border-border !bg-popover"
            />
          </ReactFlow>
        )}
      </div>

      {/* Modal */}
      <MemberModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingMember(null); }}
        onSave={(f) => void handleSave(f)}
        initial={formInit}
        members={members}
        editingId={editingMember?.id}
      />
    </div>
  );
}
