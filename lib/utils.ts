import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function apiError(error: unknown, fallback = "Unexpected error") {
  if (error instanceof Error) {
    return { error: error.message, code: "INTERNAL_ERROR" };
  }
  return { error: fallback, code: "INTERNAL_ERROR" };
}
