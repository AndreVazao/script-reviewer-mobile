import {
  DuplicateBlock,
  ReviewIssue,
  ReviewResult,
  ReviewSummary
} from "../types";
import {
  getFileExtension,
  isSupportedExtension,
  normalizeLineEndings
} from "../utils/file";

interface StackEntry {
  char: "(" | "[" | "{";
  line: number;
  column: number;
}

const OPENERS = new Set(["(", "[", "{"]);
const CLOSERS: Record<string, "(" | "[" | "{"> = {
  ")": "(",
  "]": "[",
  "}": "{"
};

function createIssue(input: Omit<ReviewIssue, "id">): ReviewIssue {
  const id = `${input.type}-${input.line}-${input.column ?? 0}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  return {
    id,
    ...input
  };
}

function countLeadingSpaces(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === " ") count++;
    else break;
  }
  return count;
}

function countLeadingTabs(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === "\t") count++;
    else break;
  }
  return count;
}

function getIndentToken(line: string): "spaces" | "tabs" | "mixed" | "none" {
  let sawSpace = false;
  let sawTab = false;

  for (const ch of line) {
    if (ch === " ") sawSpace = true;
    else if (ch === "\t") sawTab = true;
    else break;
  }

  if (!sawSpace && !sawTab) return "none";
  if (sawSpace && sawTab) return "mixed";
  if (sawSpace) return "spaces";
  return "tabs";
}

function normalizeForDuplication(line: string): string {
  return line
    .replace(/\/\/.*$/g, "")
    .replace(/#.*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function detectIndentationIssues(lines: string[]): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  let dominantIndentStyle: "spaces" | "tabs" | null = null;
  const meaningfulIndentWidths: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    if (line.trim().length === 0) continue;

    const indentToken = getIndentToken(line);

    if (indentToken === "mixed") {
      issues.push(
        createIssue({
          type: "mixed-indentation",
          severity: "warning",
          message: "Mistura de tabs e spaces no início da linha.",
          line: lineNumber,
          column: 1
        })
      );
      continue;
    }

    if (indentToken === "spaces" || indentToken === "tabs") {
      if (!dominantIndentStyle) {
        dominantIndentStyle = indentToken;
      } else if (dominantIndentStyle !== indentToken) {
        issues.push(
          createIssue({
            type: "mixed-indentation",
            severity: "warning",
            message: `Indentação diferente do padrão dominante (${dominantIndentStyle}).`,
            line: lineNumber,
            column: 1
          })
        );
      }
    }

    if (indentToken === "spaces") {
      const spaces = countLeadingSpaces(line);
      if (spaces > 0) meaningfulIndentWidths.push(spaces);
    }
  }

  const estimatedIndentUnit = estimateIndentUnit(meaningfulIndentWidths);

  if (estimatedIndentUnit && dominantIndentStyle === "spaces") {
    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      if (line.trim().length === 0) continue;

      const indentToken = getIndentToken(line);
      if (indentToken !== "spaces") continue;

      const spaces = countLeadingSpaces(line);
      if (spaces > 0 && spaces % estimatedIndentUnit !== 0) {
        issues.push(
          createIssue({
            type: "indentation",
            severity: "warning",
            message: `Indentação suspeita. Esperado múltiplo de ${estimatedIndentUnit} espaços.`,
            line: lineNumber,
            column: 1
          })
        );
      }
    }
  }

  return dedupeIssues(issues);
}

function estimateIndentUnit(values: number[]): number | null {
  const filtered = [...new Set(values.filter((v) => v > 0 && v <= 16))].sort(
    (a, b) => a - b
  );

  if (filtered.length === 0) return null;
  if (filtered.includes(2)) return 2;
  if (filtered.includes(4)) return 4;

  return filtered[0] || null;
}

function detectTrailingSpaces(lines: string[]): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/[ \t]+$/.test(line)) {
      issues.push(
        createIssue({
          type: "trailing-spaces",
          severity: "info",
          message: "Trailing spaces no fim da linha.",
          line: i + 1,
          column: line.length
        })
      );
    }
  }

  return issues;
}

function detectLongLines(lines: string[], limit = 140): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > limit) {
      issues.push(
        createIssue({
          type: "line-length",
          severity: "info",
          message: `Linha longa (${line.length} caracteres). Limite recomendado: ${limit}.`,
          line: i + 1,
          column: limit + 1
        })
      );
    }
  }

  return issues;
}

function detectBracketBalance(lines: string[]): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const stack: StackEntry[] = [];

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;
  let escaping = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      const prev = j > 0 ? line[j - 1] : "";

      if (escaping) {
        escaping = false;
        continue;
      }

      if (ch === "\\") {
        escaping = true;
        continue;
      }

      if (!inDoubleQuote && !inTemplateString && ch === "'" && prev !== "\\") {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (!inSingleQuote && !inTemplateString && ch === "\"" && prev !== "\\") {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote && ch === "`" && prev !== "\\") {
        inTemplateString = !inTemplateString;
        continue;
      }

      if (inSingleQuote || inDoubleQuote || inTemplateString) continue;

      if (OPENERS.has(ch)) {
        stack.push({
          char: ch as "(" | "[" | "{",
          line: lineNumber,
          column: j + 1
        });
      } else if (ch in CLOSERS) {
        const expected = CLOSERS[ch];
        const top = stack[stack.length - 1];

        if (!top) {
          issues.push(
            createIssue({
              type: "unbalanced-brackets",
              severity: "error",
              message: `Fecho '${ch}' sem abertura correspondente.`,
              line: lineNumber,
              column: j + 1
            })
          );
          continue;
        }

        if (top.char !== expected) {
          issues.push(
            createIssue({
              type: "unbalanced-brackets",
              severity: "error",
              message: `Fecho '${ch}' não corresponde à abertura '${top.char}'.`,
              line: lineNumber,
              column: j + 1,
              details: `Abertura original na linha ${top.line}, coluna ${top.column}.`
            })
          );
          stack.pop();
          continue;
        }

        stack.pop();
      }
    }
  }

  for (const pending of stack) {
    issues.push(
      createIssue({
        type: "unbalanced-brackets",
        severity: "error",
        message: `Abertura '${pending.char}' sem fecho correspondente.`,
        line: pending.line,
        column: pending.column
      })
    );
  }

  return issues;
}

function detectDuplicateBlocks(lines: string[]): {
  issues: ReviewIssue[];
  duplicates: DuplicateBlock[];
} {
  const issues: ReviewIssue[] = [];
  const duplicates: DuplicateBlock[] = [];
  const blockWindow = 4;
  const registry = new Map<string, { start: number; end: number }[]>();

  for (let i = 0; i <= lines.length - blockWindow; i++) {
    const rawBlock = lines.slice(i, i + blockWindow);

    if (rawBlock.every((line) => normalizeForDuplication(line).length === 0)) {
      continue;
    }

    const normalizedLines = rawBlock
      .map(normalizeForDuplication)
      .filter(Boolean);

    if (normalizedLines.length < 3) continue;

    const normalizedKey = normalizedLines.join("\n");
    const entry = registry.get(normalizedKey) ?? [];
    entry.push({ start: i + 1, end: i + blockWindow });
    registry.set(normalizedKey, entry);
  }

  for (const [normalizedKey, occurrences] of registry.entries()) {
    if (occurrences.length < 2) continue;

    for (let i = 0; i < occurrences.length - 1; i++) {
      const current = occurrences[i];
      const next = occurrences[i + 1];

      if (Math.abs(current.start - next.start) < 3) continue;

      const duplicate: DuplicateBlock = {
        normalizedKey,
        startLineA: current.start,
        endLineA: current.end,
        startLineB: next.start,
        endLineB: next.end,
        score: 1
      };

      duplicates.push(duplicate);

      issues.push(
        createIssue({
          type: "duplicate-block",
          severity: "warning",
          message: `Bloco repetido entre linhas ${current.start}-${current.end} e ${next.start}-${next.end}.`,
          line: current.start,
          endLine: current.end,
          details: `Bloco correspondente em ${next.start}-${next.end}.`
        })
      );
    }
  }

  return {
    issues: dedupeIssues(issues),
    duplicates
  };
}

function dedupeIssues(issues: ReviewIssue[]): ReviewIssue[] {
  const seen = new Set<string>();
  const output: ReviewIssue[] = [];

  for (const issue of issues) {
    const key = `${issue.type}:${issue.line}:${issue.column ?? 0}:${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(issue);
  }

  return output.sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    return (a.column ?? 0) - (b.column ?? 0);
  });
}

function buildSummary(
  lines: string[],
  issues: ReviewIssue[],
  duplicates: DuplicateBlock[]
): ReviewSummary {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;

  return {
    totalLines: lines.length,
    totalIssues: issues.length,
    errors,
    warnings,
    infos,
    duplicateBlocks: duplicates.length
  };
}

export function analyzeFile(fileName: string, rawContent: string): ReviewResult {
  const fileExtension = getFileExtension(fileName);
  const content = normalizeLineEndings(rawContent);
  const lines = content.split("\n");

  const issues: ReviewIssue[] = [];
  let duplicates: DuplicateBlock[] = [];

  if (!content.trim()) {
    issues.push(
      createIssue({
        type: "empty-file",
        severity: "warning",
        message: "O ficheiro está vazio.",
        line: 1,
        column: 1
      })
    );
  }

  if (!isSupportedExtension(fileExtension)) {
    issues.push(
      createIssue({
        type: "unsupported",
        severity: "info",
        message:
          "Extensão não especializada. A análise foi feita em modo genérico de texto.",
        line: 1,
        column: 1
      })
    );
  }

  issues.push(...detectIndentationIssues(lines));
  issues.push(...detectTrailingSpaces(lines));
  issues.push(...detectLongLines(lines, 140));
  issues.push(...detectBracketBalance(lines));

  const duplicateResult = detectDuplicateBlocks(lines);
  issues.push(...duplicateResult.issues);
  duplicates = duplicateResult.duplicates;

  const finalIssues = dedupeIssues(issues);
  const summary = buildSummary(lines, finalIssues, duplicates);

  return {
    fileName,
    fileExtension,
    content,
    lines,
    issues: finalIssues,
    duplicates,
    summary
  };
                              }
