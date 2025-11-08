export type UmlEntityKind = "class" | "interface" | "record" | "struct";

export type UmlMemberKind = "property" | "field" | "method";

export interface UmlMember {
  kind: UmlMemberKind;
  name: string;
  type?: string;
  returnType?: string;
  parameters?: string;
  access: string;
}

export interface ParsedEntity {
  name: string;
  kind: UmlEntityKind;
  members: UmlMember[];
  inherits: string[];
  implements: string[];
  sourceName?: string;
}

export interface SourceFile {
  name: string;
  content: string;
}

export interface DiagramResult {
  mermaid: string;
  entities: ParsedEntity[];
}

/**
 * Converts one or more C# source files into a Mermaid class diagram.
 */
export function createMermaidFromSources(files: SourceFile[]): DiagramResult {
  const parsed = files.flatMap((file) =>
    parseEntities(file.content, file.name)
  );
  const merged = harmonizeEntities(mergeEntities(parsed));
  const mermaid = buildMermaidDiagram(merged);

  return { mermaid, entities: merged };
}

function parseEntities(content: string, sourceName?: string): ParsedEntity[] {
  const cleaned = preprocessSource(content);
  const entities: ParsedEntity[] = [];
  const typePattern =
    /((?:public|protected|internal|private)(?:\s+(?:protected|internal))?)?\s*(?:static\s+|sealed\s+|abstract\s+|partial\s+|readonly\s+|ref\s+|unsafe\s+|new\s+)*\b(class|interface|record|struct)\s+([A-Za-z_][\w<>\.]*)\s*(?:\:\s*([^{]+))?\s*\{/g;

  let match: RegExpExecArray | null;
  while ((match = typePattern.exec(cleaned))) {
    const kind = normalizeKind(match[2]);
    const rawName = match[3].trim();
    const inheritsTokens = (match[4] ?? "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    const openBraceIndex = cleaned.indexOf("{", typePattern.lastIndex - 1);
    if (openBraceIndex === -1) {
      continue;
    }
    const closeBraceIndex = findMatchingBrace(cleaned, openBraceIndex);
    if (closeBraceIndex === -1) {
      continue;
    }

    const body = cleaned.slice(openBraceIndex + 1, closeBraceIndex);
    const members = parseMembers(body, rawName);

    const entity: ParsedEntity = {
      name: rawName,
      kind,
      members,
      inherits: [],
      implements: [],
      sourceName,
    };

    if (inheritsTokens.length) {
      // First non-interface token is treated as inheritance. Others are interfaces.
      inheritsTokens.forEach((token) => {
        if (token.toLowerCase().startsWith("i") || token.includes("<")) {
          entity.implements.push(token);
        } else if (entity.inherits.length === 0) {
          entity.inherits.push(token);
        } else {
          entity.implements.push(token);
        }
      });
    }

    entities.push(entity);
    typePattern.lastIndex = closeBraceIndex + 1;
  }

  return entities;
}

function parseMembers(body: string, rawName: string): UmlMember[] {
  const members: UmlMember[] = [];
  const cleanBody = body.replace(/^\s*\[[^\]]*\]\s*/gm, "");
  const className = stripGenerics(rawName);

  const propertyPattern =
    /(?:(public|protected|internal|private)(?:\s+(?:protected|internal))?\s+)?(?:static\s+|virtual\s+|override\s+|abstract\s+|sealed\s+|new\s+)?(?!(?:class|interface|record|struct)\b)([\w<>\[\]\.?]+)\s+([A-Za-z_][\w]*)\s*\{\s*[^{}]*?\s*\}/gm;
  const methodPattern =
    /(?:(public|protected|internal|private)(?:\s+(?:protected|internal))?\s+)?(?:static\s+|virtual\s+|override\s+|abstract\s+|sealed\s+|async\s+|partial\s+|new\s+)*([\w<>\[\]\.?]+)\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*(?:\{|=>|where|;)/g;
  const ctorPattern =
    /(?:(public|protected|internal|private)(?:\s+(?:protected|internal))?\s+)?([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*(?:\{|:|=>|;)/g;
  const fieldPattern =
    /(?:(public|protected|internal|private)(?:\s+(?:protected|internal))?\s+)?(?:static\s+|readonly\s+|volatile\s+|new\s+)?(?!(?:class|interface|record|struct)\b)([\w<>\[\]\.?]+)\s+([A-Za-z_][\w]*)\s*(?:=\s*[^;]+)?;/g;

  let propertyMatch: RegExpExecArray | null;
  while ((propertyMatch = propertyPattern.exec(cleanBody))) {
    const [, access, type, name] = propertyMatch;
    members.push({
      kind: "property",
      name,
      type,
      access: toAccess(access),
    });
  }

  let methodMatch: RegExpExecArray | null;
  while ((methodMatch = methodPattern.exec(cleanBody))) {
    const [, access, returnType, name, params] = methodMatch;
    if (name === className) {
      // Skip constructors handled separately.
      continue;
    }
    members.push({
      kind: "method",
      name,
      returnType,
      parameters: normalizeParams(params),
      access: toAccess(access),
    });
  }

  let ctorMatch: RegExpExecArray | null;
  while ((ctorMatch = ctorPattern.exec(cleanBody))) {
    const [, access, name, params] = ctorMatch;
    if (name !== className) {
      continue;
    }
    members.push({
      kind: "method",
      name,
      returnType: "",
      parameters: normalizeParams(params),
      access: toAccess(access),
    });
  }

  let fieldMatch: RegExpExecArray | null;
  while ((fieldMatch = fieldPattern.exec(cleanBody))) {
    const [, access, type, name] = fieldMatch;
    if (members.some((member) => member.name === name)) {
      continue;
    }
    members.push({
      kind: "field",
      name,
      type,
      access: toAccess(access),
    });
  }

  return members;
}

function normalizeParams(params: string): string {
  if (!params.trim()) {
    return "";
  }

  return params
    .split(",")
    .map((param) => param.trim())
    .filter(Boolean)
    .map((param) => {
      const cleaned = param.replace(/\s+=.*$/, "").replace(/\/\*.*?\*\//g, "");
      const segments = cleaned.split(/\s+/);
      const name = segments.pop();
      const type = segments.join(" ");
      if (!name) {
        return cleaned;
      }
      return name && type ? `${name}: ${type}` : cleaned;
    })
    .join(", ");
}

function mergeEntities(entities: ParsedEntity[]): ParsedEntity[] {
  const map = new Map<string, ParsedEntity>();

  entities.forEach((entity) => {
    const key = entity.name;
    if (!map.has(key)) {
      map.set(key, {
        ...entity,
        members: [...entity.members],
        inherits: [...entity.inherits],
        implements: [...entity.implements],
      });
      return;
    }

    const existing = map.get(key)!;
    const mergedMembers = [...existing.members];
    entity.members.forEach((member) => {
      if (
        !mergedMembers.some(
          (current) =>
            current.kind === member.kind &&
            current.name === member.name &&
            current.parameters === member.parameters
        )
      ) {
        mergedMembers.push(member);
      }
    });

    existing.members = mergedMembers;
    existing.inherits = [
      ...new Set([...existing.inherits, ...entity.inherits]),
    ];
    existing.implements = [
      ...new Set([...existing.implements, ...entity.implements]),
    ];
  });

  return Array.from(map.values());
}

function harmonizeEntities(entities: ParsedEntity[]): ParsedEntity[] {
  const kindMap = new Map<string, UmlEntityKind>();
  entities.forEach((entity) => {
    kindMap.set(stripGenerics(entity.name), entity.kind);
  });

  return entities.map((entity) => {
    const resolvedImplements: string[] = [];
    const resolvedInherits = [...entity.inherits];

    entity.implements.forEach((target) => {
      const kind = kindMap.get(stripGenerics(target));
      if (kind && kind !== "interface") {
        resolvedInherits.push(target);
        return;
      }
      resolvedImplements.push(target);
    });

    return {
      ...entity,
      inherits: Array.from(new Set(resolvedInherits)),
      implements: Array.from(new Set(resolvedImplements)),
    };
  });
}

function buildMermaidDiagram(entities: ParsedEntity[]): string {
  if (!entities.length) {
    return "";
  }

  const lines: string[] = ["classDiagram"];
  const idMap = new Map<string, string>();
  const counts = new Map<string, number>();

  const getId = (name: string) => {
    const base = sanitizeForId(stripGenerics(name)) || "Type";
    const current = counts.get(base) ?? 0;
    counts.set(base, current + 1);
    const suffix = current > 0 ? `_${current + 1}` : "";
    const finalId = `${base}${suffix}`;
    idMap.set(name, finalId);
    return finalId;
  };

  const ensurePlaceholder = (name: string) => {
    const existing = idMap.get(name);
    if (existing) {
      return existing;
    }
    const placeholder = sanitizeForId(stripGenerics(name)) || "External";
    idMap.set(name, placeholder);
    lines.push(`    class ${placeholder}`);
    return placeholder;
  };

  entities.forEach((entity) => {
    const id = getId(entity.name);
    lines.push(`    class ${id} {`);
    if (entity.kind === "interface") {
      lines.push(`        <<interface>>`);
    } else if (entity.kind === "record") {
      lines.push(`        <<record>>`);
    } else if (entity.kind === "struct") {
      lines.push(`        <<struct>>`);
    }
    entity.members.forEach((member) => {
      const label = formatMember(member);
      if (label) {
        lines.push(`        ${label}`);
      }
    });
    lines.push("    }");
  });

  entities.forEach((entity) => {
    const from = idMap.get(entity.name);
    if (!from) {
      return;
    }

    entity.inherits.forEach((target) => {
      const to = ensurePlaceholder(target);
      lines.push(`    ${to} <|-- ${from}`);
    });

    entity.implements.forEach((target) => {
      const to = ensurePlaceholder(target);
      lines.push(`    ${to} <|.. ${from}`);
    });
  });

  return lines.join("\n");
}

function formatMember(member: UmlMember): string {
  const visibility = member.access || "~";
  if (member.kind === "method") {
    const params = member.parameters ?? "";
    const returnType = member.returnType ? ` : ${member.returnType}` : "";
    return `${visibility}${member.name}(${params})${returnType}`;
  }

  const typeLabel = member.type ? ` : ${member.type}` : "";
  return `${visibility}${member.name}${typeLabel}`;
}

function preprocessSource(content: string): string {
  return content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/#region[\s\S]*?#endregion/g, "")
    .replace(/record\s+struct/g, "record")
    .replace(/record\s+class/g, "record");
}

function stripGenerics(name: string): string {
  return name.replace(/<.*?>/g, "").trim();
}

function sanitizeForId(value: string): string {
  return value.replace(/[^\w]/g, "_");
}

function toAccess(value?: string): string {
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
  if (normalized.includes("protected") && normalized.includes("internal")) {
    return "#";
  }
  if (normalized.includes("protected")) {
    return "#";
  }
  if (normalized.includes("internal")) {
    return "~";
  }
  return "~";
}

function findMatchingBrace(text: string, startIndex: number): number {
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

function normalizeKind(kind: string): UmlEntityKind {
  switch (kind) {
    case "interface":
      return "interface";
    case "record":
      return "record";
    case "struct":
      return "struct";
    default:
      return "class";
  }
}
