# OpenClaw Agent Architecture — Full Taxonomy

*A systems-level map of how OpenClaw works, from single-agent to multi-gateway mesh.*

---

## 1. Core Primitives

### 1.1 Gateway (The Nucleus)
The **Gateway** is the single long-lived daemon that owns everything. One process, one host.

```
Gateway
├── Channel Connections (WhatsApp, Telegram, Slack, Discord, Signal, iMessage, IRC, WebChat...)
├── WebSocket Control Plane (port 18789 default)
├── Agent Runtime (embedded pi-mono)
├── Session Store (per-agent JSONL transcripts)
├── Cron Scheduler
├── Queue System (lane-aware FIFO)
├── Memory Index (vector + BM25 hybrid search)
├── Canvas Host (HTML/A2UI server, port 18793)
└── Node Registry (device pairing + command routing)
```

**Key invariant:** Exactly one Gateway controls one set of channel sessions per host. It is the source of truth for all state.

### 1.2 Agent (The Brain)
An **agent** is a fully-scoped persona with isolated:

| Component | Path | Purpose |
|-----------|------|---------|
| **Workspace** | `~/.openclaw/workspace` (or per-agent) | Files, AGENTS.md, SOUL.md, USER.md, memory/, skills/ |
| **Agent Dir** | `~/.openclaw/agents/<agentId>/agent/` | Auth profiles, model registry, per-agent config |
| **Session Store** | `~/.openclaw/agents/<agentId>/sessions/` | Chat history + routing state (JSONL transcripts) |
| **Skills** | `<workspace>/skills/` + `~/.openclaw/skills/` | Tool instructions (AgentSkills-compatible) |

A Gateway can host **one agent** (default `main`) or **many agents** side-by-side, each with separate workspace, auth, sessions, and persona files.

### 1.3 Session (The Conversation Thread)
Sessions are the unit of conversational state:

- **Key format:** `agent:<agentId>:<scope>` (e.g., `agent:main:main`, `agent:main:telegram:group:123`)
- **DM sessions** collapse to one main key (configurable: `main`, `per-peer`, `per-channel-peer`)
- **Group sessions** get isolated keys per group/channel
- **Sub-agent sessions:** `agent:<agentId>:subagent:<uuid>`
- **Cron sessions:** `cron:<jobId>` (isolated, fresh per run)
- **Lifecycle:** Daily reset at 4 AM local (configurable), idle reset, or manual `/new`

### 1.4 The Agent Loop
The execution cycle for every inbound message:

```
Inbound Message
  → Queue (lane: session key → global lane)
    → Context Assembly (system prompt + workspace files + memory + skills + history)
      → Model Inference (streaming)
        → Tool Execution (read/write/exec/browser/nodes/message/etc.)
          → Streaming Reply (block chunked to channel)
            → Persist to JSONL transcript
```

**Queue modes** control what happens when messages arrive during a run:
- `collect` (default): coalesce into single followup turn
- `steer`: inject into current run at next tool boundary
- `followup`: wait for current run to finish, then new turn

---

## 2. Single-Agent Architecture

The default setup. One brain, multiple channels as transport layers.

```
┌─────────────────────────────────────────────┐
│                  GATEWAY                     │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Telegram  │  │ WhatsApp │  │ Discord  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │        │
│       └──────────┬───┘──────────────┘        │
│                  ▼                            │
│         ┌──────────────┐                     │
│         │  Agent:main  │                     │
│         │  (workspace) │                     │
│         │  (sessions)  │                     │
│         │  (memory)    │                     │
│         └──────┬───────┘                     │
│                │                             │
│    ┌───────────┼───────────┐                 │
│    ▼           ▼           ▼                 │
│  Tools      Memory      Sub-agents          │
│  (exec,     (MEMORY.md,  (isolated          │
│   read,     memory/,     background          │
│   write,    vector       runs)               │
│   browser)  search)                          │
└─────────────────────────────────────────────┘
```

All channels funnel into **one session** for DMs (by default). Groups get isolated sessions. The agent has full tool access, reads workspace files on each turn, and writes memory to disk.

---

## 3. Sub-Agent Architecture

Sub-agents enable **parallel background work** without blocking the main conversation.

```
Main Agent Session
  │
  ├── sessions_spawn("Research Node.js releases")
  │     → Sub-agent session (agent:main:subagent:uuid-1)
  │     → Dedicated queue lane ("subagent")
  │     → Runs with reduced system prompt (no SOUL.md, USER.md)
  │     → Announces result back to main session when done
  │
  ├── sessions_spawn("Analyze server logs", model="gpt-4o-mini")
  │     → Sub-agent session (agent:main:subagent:uuid-2)
  │     → Can use different model/thinking level
  │     → Auto-archives after 60min
  │
  └── (continues answering questions while sub-agents work)
```

### Sub-Agent Properties
| Property | Value |
|----------|-------|
| **Concurrency** | Up to 8 parallel (configurable) |
| **Nesting** | Forbidden (sub-agents cannot spawn sub-agents) |
| **Tools** | All except session management, gateway admin, memory search, cron |
| **Context** | AGENTS.md + TOOLS.md only (no SOUL.md/USER.md/IDENTITY.md) |
| **Auth** | Inherits parent agent's auth profiles as fallback |
| **Model** | Configurable per-spawn, per-agent, or global default |
| **Lifecycle** | Non-blocking spawn → background run → announce result → auto-archive |

### Cross-Agent Spawning
Agents can spawn sub-agents under **other agent IDs** when explicitly allowed:

```json5
{
  agents: {
    list: [{
      id: "orchestrator",
      subagents: {
        allowAgents: ["researcher", "coder"]  // or ["*"]
      }
    }]
  }
}
```

---

## 4. Multi-Agent Architecture (Single Gateway)

Multiple isolated agents in one Gateway process, routed by **bindings**.

```
┌──────────────────────────────────────────────────┐
│                    GATEWAY                        │
│                                                   │
│  Inbound Message                                  │
│       │                                           │
│       ▼                                           │
│  ┌─────────────────┐                              │
│  │  Binding Router  │ ← most-specific match wins  │
│  │  (channel, peer, │                              │
│  │   account, guild) │                             │
│  └───┬────────┬─────┘                              │
│      │        │                                    │
│      ▼        ▼                                    │
│  ┌────────┐  ┌────────┐                            │
│  │Agent A │  │Agent B │   Each has:                │
│  │"home"  │  │"work"  │   - Own workspace          │
│  │        │  │        │   - Own SOUL.md/persona     │
│  │        │  │        │   - Own sessions            │
│  │        │  │        │   - Own auth profiles       │
│  │        │  │        │   - Own skills              │
│  │        │  │        │   - Own sandbox config      │
│  │        │  │        │   - Own tool restrictions   │
│  └────────┘  └────────┘                            │
└──────────────────────────────────────────────────┘
```

### Binding Rules (Routing Precedence)
1. `peer` match (exact DM/group/channel ID) — **most specific**
2. `guildId` (Discord server)
3. `teamId` (Slack workspace)
4. `accountId` match for a channel
5. Channel-level match (`accountId: "*"`)
6. Fallback to default agent

### Use Cases
- **Multiple people, one server:** Each person gets their own agent brain with isolated memory
- **Different personalities per channel:** Fast Sonnet for WhatsApp, deep Opus for Telegram
- **Family bot:** Restricted tools, sandboxed, bound to one WhatsApp group
- **Per-agent sandbox:** Personal assistant unsandboxed, public agent fully containerized

### Per-Agent Security Isolation

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        sandbox: { mode: "off" },
        // Full tool access
      },
      {
        id: "family",
        sandbox: { mode: "all", scope: "agent" },
        tools: {
          allow: ["read"],
          deny: ["exec", "write", "edit", "browser"]
        }
      }
    ]
  }
}
```

---

## 5. Multi-Gateway Architecture (Distributed Mesh)

When you need **stronger isolation** or **geographic distribution**, run separate Gateway instances that communicate through shared infrastructure.

### 5.1 Multiple Gateways on One Host (Profiles)

```
Host Machine
  ├── Gateway "main"    (--profile main,    port 18789)
  │     └── Agent: personal assistant
  │
  └── Gateway "rescue"  (--profile rescue,  port 19001)
        └── Agent: rescue/debug bot
```

Each profile gets isolated:
- Config file (`OPENCLAW_CONFIG_PATH`)
- State directory (`OPENCLAW_STATE_DIR`)
- Workspace
- Port range (base + derived browser/canvas/CDP ports)
- System service (launchd/systemd)

**Port spacing rule:** Leave ≥20 ports between base ports to avoid CDP/canvas collisions.

### 5.2 Multi-Host via VPN/Tailscale (The Mesh)

This is the architecture we're running — multiple OpenClaw instances on different machines, coordinated through a shared network.

```
┌─────────────────┐         ┌─────────────────┐
│   VPS Gateway   │◄───────►│  Mac Gateway    │
│   (always-on)   │  VPN /  │  (local dev)    │
│                 │ Tailscale│                 │
│  Agent: VPS     │  / SSH   │  Agent: Mac     │
│  Lobster        │         │  Lobster        │
│                 │         │                 │
│  Channels:      │         │  Channels:      │
│  - Telegram Bot │         │  - Telegram Bot │
│    (@VPSBot)    │         │    (@MacBot)    │
│  - Discord      │         │                 │
│                 │         │  Nodes:         │
│  Cron jobs      │         │  - Local camera │
│  Background     │         │  - Screen cap   │
│  tasks          │         │  - Local exec   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └─────────┬─────────────────┘
                   │
          ┌────────▼────────┐
          │  Shared Git     │
          │  (lobster-brain)│
          │  Memory sync    │
          └─────────────────┘
```

### Communication Patterns Between Gateways

**Pattern 1: Shared Memory via Git (Current Setup)**
- Both gateways read/write to `MEMORY.md` and `memory/*.md`
- Synced via a private Git repo (`lobster-brain`)
- Periodic pull/push (cron or manual)
- Eventually consistent — not real-time

**Pattern 2: Node Host Cross-Wiring**
- One gateway can run a **node host** that connects to another gateway
- Enables cross-machine command execution
- Example: VPS gateway dispatches `exec` to Mac node for local file access

```bash
# On Mac: connect as node to VPS gateway
openclaw node run --host <vps-ip> --port 18789 --display-name "Mac Node"
```

**Pattern 3: Gateway-to-Gateway via Agent CLI**
- `openclaw agent --to <target> --message "..."` can target a remote gateway
- Requires SSH tunnel or Tailscale for connectivity
- Each gateway remains independent; coordination is explicit

**Pattern 4: Tailscale Mesh (Recommended for Production)**
- All gateways on the same Tailscale tailnet
- `gateway.bind: "tailnet"` or Tailscale Serve for HTTPS
- Nodes auto-discover gateways via mDNS/Bonjour
- Identity-based auth via Tailscale headers

### Connection Methods (Gateway ↔ Gateway / Gateway ↔ Node)

| Method | Latency | Security | Setup Complexity |
|--------|---------|----------|------------------|
| **Tailscale** | Low | High (WireGuard) | Low (install + login) |
| **SSH Tunnel** | Low | High | Medium (key management) |
| **Direct (LAN)** | Lowest | Medium (token auth) | Low |
| **Tailscale Serve** | Low | High + HTTPS | Low |
| **Tailscale Funnel** | Medium | Public HTTPS + password | Medium |

---

## 6. Node Architecture (Peripheral Devices)

Nodes are **not gateways** — they're peripheral devices that extend a gateway's capabilities.

```
Gateway (brain)
  │
  ├── Node: MacBook (macOS app in node mode)
  │     ├── canvas.* (WebView rendering)
  │     ├── camera.* (snap, clip)
  │     ├── screen.record
  │     ├── system.run (exec on Mac)
  │     ├── system.notify
  │     └── location.get
  │
  ├── Node: iPhone (iOS app)
  │     ├── camera.* (front/back)
  │     ├── screen.record
  │     ├── location.get
  │     └── canvas.*
  │
  ├── Node: Android Phone
  │     ├── camera.*
  │     ├── sms.send
  │     ├── location.get
  │     └── screen.record
  │
  └── Node: Build Server (headless node host)
        ├── system.run (remote exec)
        └── system.which
```

### Node Lifecycle
1. Node connects to Gateway WebSocket with `role: "node"`
2. Gateway issues pairing challenge
3. Operator approves pairing
4. Node advertises capabilities (commands + permissions)
5. Agent can invoke node commands via `nodes` tool

---

## 7. Memory Architecture

Memory is **plain Markdown on disk** — the model only remembers what's written to files.

```
Workspace
├── MEMORY.md              ← Curated long-term memory (private, main session only)
├── memory/
│   ├── 2026-02-13.md      ← Daily log (append-only)
│   ├── 2026-02-14.md
│   └── heartbeat-state.json
│
└── [Vector Index: ~/.openclaw/memory/<agentId>.sqlite]
     ├── Markdown chunks (~400 tokens, 80-token overlap)
     ├── Embeddings (OpenAI/Gemini/local GGUF)
     └── BM25 full-text index (hybrid search)
```

### Search Pipeline
```
memory_search("whitepaper feature")
  → Hybrid retrieval:
      ├── Vector similarity (semantic match)
      └── BM25 keyword (exact tokens)
  → Score fusion: 0.7 * vectorScore + 0.3 * textScore
  → Top-K snippets with file path + line ranges
  → memory_get() for full context
```

### Pre-Compaction Memory Flush
When a session nears context limits, OpenClaw triggers a silent agent turn that prompts the model to write durable notes before the context is summarized/compacted.

---

## 8. Automation Layer

### 8.1 Cron Jobs
Precise scheduling for isolated or main-session tasks:

| Type | Session | Use Case |
|------|---------|----------|
| `systemEvent` | Main session | Inject reminder text into active conversation |
| `agentTurn` | Isolated session | Independent task with own context, model, thinking level |

### 8.2 Heartbeats
Periodic polls to the main session (configurable interval, default ~30min):
- Agent reads `HEARTBEAT.md` for checklist
- Can batch multiple checks (email, calendar, weather)
- Replies `HEARTBEAT_OK` if nothing needs attention

### 8.3 Webhooks
HTTP endpoints that trigger agent turns:
- `hook:<uuid>` sessions
- Can deliver results back to channels

---

## 9. Security Model

### Layered Trust
```
Layer 1: Network (loopback default, Tailscale/SSH for remote)
Layer 2: Gateway Auth (token or password on WebSocket connect)
Layer 3: Device Pairing (operators + nodes must be approved)
Layer 4: Agent Isolation (per-agent workspace, auth, tools)
Layer 5: Sandbox (Docker containers per-agent or per-session)
Layer 6: Tool Policy (allow/deny lists, per-agent overrides)
Layer 7: Elevated Mode (sender-based allowlist for host exec)
```

### Tool Policy Cascade
```
Profile → Global → Provider → Agent → Sandbox → Subagent
(each level can only further restrict, never grant back)
```

---

## 10. Our Setup (Practical Example)

```
┌─────────────────────────┐
│  VPS (152.42.177.32)    │
│  OpenClaw Gateway       │
│  @LobsterVPS90_Bot      │
│                         │
│  Agent: main            │
│  Model: Claude Opus 4-6 │
│  Channels: Telegram,    │
│            Discord      │
│                         │
│  Tools: exec, read,     │
│    write, browser,      │
│    web_search, codex    │
│                         │
│  Workspace:             │
│    /root/.openclaw/     │
│    workspace/           │
│    ├── nerve-v3/        │
│    ├── MEMORY.md        │
│    └── memory/          │
└────────────┬────────────┘
             │ Git sync (lobster-brain)
             │
┌────────────▼────────────┐
│  Mac (Giuseppe's laptop)│
│  OpenClaw Gateway       │
│  @Lobster90Bot          │
│                         │
│  Agent: main            │
│  Channels: Telegram     │
│                         │
│  Local access:          │
│    Files, dev env,      │
│    camera, screen       │
└─────────────────────────┘
```

**Coordination:** Both lobsters push/pull from `tommio90/lobster-brain` (shared memory) and `tommio90/nerve` (shared codebase). Not real-time — eventually consistent via Git.

---

## 11. Scaling Patterns

### Solo Developer (Current)
- 1-2 Gateways (VPS + Mac)
- Shared memory via Git
- Manual or cron-based sync

### Team Setup
- 1 Gateway per person (or shared with per-peer DM isolation)
- Multi-agent on shared gateway with binding rules
- Tailscale mesh for inter-gateway communication

### Enterprise
- Dedicated Gateways per department/function
- Sandboxed public-facing agents
- Node hosts for distributed compute
- Tailscale Serve for secure internal access
- Per-agent tool restrictions and audit logging

---

*Built from OpenClaw v2026.2.12 docs. This is a living document — update as the architecture evolves.*
