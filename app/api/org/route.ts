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
  const data = (await res.json()) as { results: { type: string; response?: { result: { cols: { name: string }[]; rows: { type: string; value: string }[][] } }; error?: unknown }[] };
  const result = data.results[0];
  if (result.type === "error") throw new Error(JSON.stringify(result.error));
  return result.response!.result;
}

function rowToObj(cols: { name: string }[], row: { value: string }[]) {
  const obj: Record<string, string | null> = {};
  cols.forEach((c, i) => { obj[c.name] = row[i]?.value ?? null; });
  return obj;
}

export async function GET() {
  try {
    const result = await turso("SELECT id,name,role,department,type,avatar,initials,status,parentId,metadata,createdAt,updatedAt FROM OrgMember ORDER BY createdAt ASC");
    const members = result.rows.map((r) => rowToObj(result.cols, r as unknown as { value: string }[]));
    return NextResponse.json({ members });
  } catch (err) {
    console.error("[GET /api/org]", err);
    return NextResponse.json({ members: [], error: String(err) });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, string | null>;
    const id = `org_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    await turso(
      "INSERT INTO OrgMember (id,name,role,department,type,avatar,initials,status,parentId,metadata,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [id, body.name, body.role, body.department ?? null, body.type ?? "human", body.avatar ?? null, body.initials ?? null, body.status ?? "active", body.parentId ?? null, body.metadata ?? "{}", now, now]
    );
    const row = await turso("SELECT * FROM OrgMember WHERE id=?", [id]);
    const member = row.rows[0] ? rowToObj(row.cols, row.rows[0] as unknown as { value: string }[]) : { id };
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/org]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
