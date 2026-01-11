import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calculateWinRate(wins: number, losses: number, draws: number): number {
  const total = wins + losses + draws;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getMatchResultLabel(homeScore: number, awayScore: number): "W" | "D" | "L" {
  if (homeScore > awayScore) return "W";
  if (homeScore < awayScore) return "L";
  return "D";
}

export function getResultColor(result: "W" | "D" | "L"): string {
  switch (result) {
    case "W":
      return "var(--constructive)";
    case "L":
      return "var(--destructive)";
    case "D":
      return "var(--caution)";
  }
}
