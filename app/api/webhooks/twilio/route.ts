import { ok } from "@/lib/api";

export async function POST(request: Request) {
  const payload = await request.text();
  return ok({ received: true, payloadLength: payload.length });
}
