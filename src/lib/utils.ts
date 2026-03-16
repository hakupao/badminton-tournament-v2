import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeIntegerInput(value: string) {
  return value.replace(/[^\d]/g, "")
}

export function clampNumber(value: number, min?: number, max?: number) {
  let next = value
  if (min !== undefined) next = Math.max(min, next)
  if (max !== undefined) next = Math.min(max, next)
  return next
}

export function parseIntegerInput(
  value: string,
  fallback: number,
  options?: { min?: number; max?: number }
) {
  if (!value.trim()) {
    return clampNumber(fallback, options?.min, options?.max)
  }

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    return clampNumber(fallback, options?.min, options?.max)
  }

  return clampNumber(parsed, options?.min, options?.max)
}
