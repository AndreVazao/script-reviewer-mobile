export type Severity = "error" | "warning" | "info";

export type IssueType =
  | "indentation"
  | "mixed-indentation"
  | "trailing-spaces"
  | "line-length"
  | "unbalanced-brackets"
  | "duplicate-block"
  | "empty-file"
  | "unsupported";

export interface ReviewIssue {
  id: string;
  type: IssueType;
  severity: Severity;
  message: string;
  line: number;
  column?: number;
  endLine?: number;
  details?: string;
}

export interface DuplicateBlock {
  normalizedKey: string;
  startLineA: number;
  endLineA: number;
  startLineB: number;
  endLineB: number;
  score: number;
}

export interface ReviewSummary {
  totalLines: number;
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  duplicateBlocks: number;
}

export interface ReviewResult {
  fileName: string;
  fileExtension: string;
  content: string;
  lines: string[];
  issues: ReviewIssue[];
  duplicates: DuplicateBlock[];
  summary: ReviewSummary;
}
