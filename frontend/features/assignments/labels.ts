/** Badge colours per status / priority (labels come from the i18n dictionary). */
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

export const STATUSES = ["todo", "in_progress", "done"] as const;
export const PRIORITIES = ["low", "normal", "high"] as const;
