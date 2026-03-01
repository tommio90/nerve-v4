"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type InviteDetails = {
  email: string;
  role: string;
};

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/invites/validate?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Invite invalid");
        }
        if (active) setInvite(json as InviteDetails);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Invite invalid");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to accept invite");
      }
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <h1 className="synapse-heading">Join the team</h1>
      <Card className="space-y-4 p-6">
        {loading ? <p className="text-sm text-muted-foreground">Validating invite...</p> : null}
        {!loading && error ? <p className="text-sm text-red-400">{error}</p> : null}
        {!loading && invite ? (
          <div className="space-y-1 text-sm text-muted-foreground">
            <div><span className="text-foreground">Email:</span> {invite.email}</div>
            <div><span className="text-foreground">Role:</span> {invite.role}</div>
          </div>
        ) : null}

        {!loading && invite ? (
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input placeholder="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Accept invite"}
            </Button>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
