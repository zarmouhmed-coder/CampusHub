import type { AssignmentStatus, Priority } from "@/types/api";

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Élevée",
};

export const STATUS_BADGE = {
  todo: "neutral",
  in_progress: "warning",
  done: "success",
} as const;

export const PRIORITY_BADGE = {
  low: "neutral",
  normal: "accent",
  high: "danger",
} as const;
