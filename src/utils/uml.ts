export function stripGenerics(name: string): string {
  return name.replace(/<.*?>/g, "").trim();
}

export function toAccess(value?: string): string {
  if (!value) {
    return "~";
  }
  const normalized = value.toLowerCase();
  if (normalized.includes("public")) {
    return "+";
  }
  if (normalized.includes("private")) {
    return "-";
  }
  if (normalized.includes("protected")) {
    return "#";
  }
  if (normalized.includes("internal") || normalized.includes("package")) {
    return "~";
  }
  return "~";
}

export function findMatchingBrace(text: string, startIndex: number): number {
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

export function normalizeParams(params: string): string {
  if (!params.trim()) {
    return "";
  }

  return params
    .split(",")
    .map((param) => param.trim())
    .filter(Boolean)
    .map((param) => {
      const cleaned = param
        .replace(/\s+=.*$/, "")
        .replace(/\/\*.*?\*\//g, "")
        .replace(/@[\w.]+/g, "")
        .trim();
      const segments = cleaned.split(/\s+/);
      if (segments.length === 1) {
        return cleaned;
      }
      const name = segments.pop();
      const type = segments.join(" ");
      return name && type ? `${name}: ${type}` : cleaned;
    })
    .join(", ");
}
