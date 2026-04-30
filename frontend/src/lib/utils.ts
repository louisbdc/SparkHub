import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string, maxLength = 2): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => [...n][0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength) || name.trim().slice(0, maxLength).toUpperCase() || '?'
}
