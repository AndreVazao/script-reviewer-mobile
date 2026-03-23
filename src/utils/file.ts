export function getFileExtension(fileName: string): string {
  const clean = fileName.trim().toLowerCase();
  const parts = clean.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function getLanguageLabel(ext: string): string {
  const map: Record<string, string> = {
    js: "JavaScript",
    jsx: "JavaScript JSX",
    ts: "TypeScript",
    tsx: "TypeScript TSX",
    json: "JSON",
    css: "CSS",
    html: "HTML",
    py: "Python",
    java: "Java",
    kt: "Kotlin",
    xml: "XML",
    txt: "Text"
  };

  return map[ext] ?? "Text";
}

export function isSupportedExtension(ext: string): boolean {
  const supported = new Set([
    "js",
    "jsx",
    "ts",
    "tsx",
    "json",
    "css",
    "html",
    "py",
    "java",
    "kt",
    "xml",
    "txt",
    "md"
  ]);

  return supported.has(ext);
}
