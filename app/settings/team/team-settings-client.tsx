"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TeamUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

const ROLE_OPTIONS = ["OWNER", "MEMBER", "VIEWER"] as const;

export function TeamSettingsClient() {
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("MEMBER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pendingInvites = useMemo(
    () => invites.filter((invite) => !invite.usedAt && new Date(invite.expiresAt).getTime() > Date.now()),
    [invites],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, invitesRes] = await Promise.all([fetch("/api/team"), fetch("/api/invites")]);
      const teamJson = await teamRes.json();
      const invitesJson = await invitesRes.json();

      if (!teamRes.ok) throw new Error(teamJson.error || "Failed to load team");
      if (!invitesRes.ok) throw new Error(invitesJson.error || "Failed to load invites");

      setTeam(teamJson.users as TeamUser[]);
      setInvites(invitesJson.invites as Invite[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createInvite() {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create invite");
      setInviteLink(json.inviteUrl || null);
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateRole(userId: string, nextRole: string) {
    setError(null);
    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update role");
      setTeam((prev) => prev.map((user) => (user.id === userId ? (json.user as TeamUser) : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function removeUser(userId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/team/${userId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove user");
      setTeam((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove user");
    }
  }

  async function revokeInvite(inviteId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to revoke invite");
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    }
  }

  return (
    <div className="space-y-6">
      {error ? <Card className="border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</Card> : null}
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Team Members</h2>
            <p className="text-sm text-muted-foreground">Manage roles and access.</p>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading team...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((user) => {
                const isOwner = user.role === "OWNER";
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>
                      <select
                        className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-foreground disabled:opacity-60"
                        value={user.role}
                        disabled={isOwner}
                        onChange={(event) => updateRole(user.id, event.target.value)}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" disabled={isOwner} onClick={() => removeUser(user.id)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Pending Invites</h2>
          <p className="text-sm text-muted-foreground">Invite new members with a secure link.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-w-[220px] flex-1"
          />
          <select
            className="h-10 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-foreground"
            value={role}
            onChange={(event) => setRole(event.target.value as (typeof ROLE_OPTIONS)[number])}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Button onClick={createInvite} disabled={submitting}>
            {submitting ? "Creating..." : "Create Invite Link"}
          </Button>
        </div>
        {inviteLink ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <p className="text-muted-foreground">Invite link</p>
            <p className="break-all text-foreground">{inviteLink}</p>
          </div>
        ) : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading invites...</p>
        ) : pendingInvites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.email}</TableCell>
                  <TableCell>{invite.role}</TableCell>
                  <TableCell>{new Date(invite.expiresAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => revokeInvite(invite.id)}>
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
