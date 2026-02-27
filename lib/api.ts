import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(
  error: string,
  code: ApiErrorCode,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json({ error, code, details }, { status });
}
