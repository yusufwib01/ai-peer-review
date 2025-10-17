export type Severity = "low" | "medium" | "high" | "critical";

export interface Issue {
  severity: Severity;
  file: string;
  line: number;
  issue: string;
  recommendation?: string;
  code_suggestion?: string | null;
  [k: string]: unknown;
}

export interface ReviewReport {
  commit: string;
  issues: Issue[];
}
