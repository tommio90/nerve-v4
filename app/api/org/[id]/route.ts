import { NextResponse } from "next/server";

const TURSO_URL = "https://nerve-v3-gtomasello90.aws-ap-northeast-1.turso.io";

async function turso(sql: string, args?: (string | number | null)[]) {
  const token = process.env.TURSO_AUTH_TOKEN!;
  const stmt = args ? { sql, args: args.map((a) => a === null ? { type: "null" } : { type: typeof a === "number" ? "integer" : "text", value: String(a) }) } : { sql };
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ type: "execute", stmt }] }),
  });
  const data = (await res.json()) as { results: { type: string; response?: { result: { cols: { name: string }[]; rows: { value: string }[][] } }; error?: unknown }[] };
  const result = data.results[0];
  if (result.type === "error") throw new Error(JSON.stringify(result.error));
  return result.response!.result;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json()) as Record<string, string | null | undefined>;
    const now = new Date().toISOString();
    const fields: [string, string | null][] = [["updatedAt", now]];
    const allowed = ["name","role","department","type","avatar","initials","status","parentId"] as const;
    for (const k of allowed) {
      if (k in body) fields.push([k, body[k] === undefined ? null : (body[k] as string | null)]);
    }
    if ("metadata" in body) fields.push(["metadata", typeof body.metadata === "string" ? body.metadata : JSON.stringify(body.metadata)]);
    const sets = fields.map(([k]) => `${k} = ?`).join(", ");
    const args: (string | null)[] = [...fields.map(([, v]) => v), id];
    await turso(`UPDATE OrgMember SET ${sets} WHERE id = ?`, args);
    const row = await turso("SELECT * FROM OrgMember WHERE id=?", [id]);
    const member = row.rows[0] ? Object.fromEntries(row.cols.map((c, i) => [c.name, row.rows[0][i]?.value ?? null])) : {};
    return NextResponse.json({ member });
  } catch (err) {
    console.error("[PATCH /api/org]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const existing = await turso("SELECT parentId FROM OrgMember WHERE id=?", [id]);
    if (existing.rows.length > 0) {
      const parentId = existing.rows[0][0]?.value ?? null;
      await turso("UPDATE OrgMember SET parentId=? WHERE parentId=?", [parentId, id]);
    }
    await turso("DELETE FROM OrgMember WHERE id=?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/org]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
